"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LeaderboardItem = {
  id: string;
  // 👇 address is what we want to show as the main title
  address: string | null;
  // title is optional / legacy, used only as a fallback
  title?: string | null;
  description: string | null;
  suburb: string | null;
  votes: number;
  hide_number: boolean;
  lat: number | null;
  lng: number | null;
};

type RankedItem = LeaderboardItem & { rank: number };

const RUN_KEY = "my_run_v1";

type RunItem = {
  id: string;
  address: string;
  suburb: string | null;
  lat: number | null;
  lng: number | null;
};

function stripHouseNumber(address: string) {
  return address.replace(/^\s*\d+\s+/, "");
}

// 👇 Normalise suburbs so "Upper coomera" / "upper Coomera" etc become one key
function normalizeSuburbName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function LeaderboardPage() {
  const [items, setItems] = useState<RankedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // suburbFilterKey is the *normalised* suburb key
  const [suburbFilterKey, setSuburbFilterKey] = useState<string>("all");
  // [key, label] → ["upper coomera", "Upper Coomera"]
  const [suburbOptions, setSuburbOptions] = useState<Array<[string, string]>>(
    []
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch leaderboard
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/leaderboard");
        const body = await res.json();

        if (!res.ok) {
          setErr(body.error || "Failed to load leaderboard");
          setLoading(false);
          return;
        }

        // body.items or body itself – keep both paths
        const list: LeaderboardItem[] = body.items || body || [];

        // sort by votes desc, then by address/title for stable order
        const ranked: RankedItem[] = list
          .sort((a, b) => {
            if (b.votes !== a.votes) return b.votes - a.votes;
            const aAddr = (a.address || a.title || "").toLowerCase();
            const bAddr = (b.address || b.title || "").toLowerCase();
            return aAddr.localeCompare(bAddr);
          })
          .map((item, idx) => ({
            ...item,
            rank: idx + 1,
          }));

        setItems(ranked);

        // 👇 Build *deduped* suburb options using normalised keys
        const suburbMap = new Map<string, string>();
        for (const item of ranked) {
          if (!item.suburb) continue;
          const key = normalizeSuburbName(item.suburb);
          if (!suburbMap.has(key)) {
            suburbMap.set(key, item.suburb.trim());
          }
        }
        const options = Array.from(suburbMap.entries()).sort((a, b) =>
          a[1].localeCompare(b[1])
        );
        setSuburbOptions(options);

        setLoading(false);
      } catch (e: any) {
        setErr(e?.message || "Failed to load leaderboard");
        setLoading(false);
      }
    }

    load();
  }, []);

  // Apply suburb filter using the normalised key
  const filtered = items.filter((item) =>
    suburbFilterKey === "all"
      ? true
      : item.suburb &&
        normalizeSuburbName(item.suburb) === suburbFilterKey
  );

  // Shared RUN_KEY with the map – add to localStorage
  function addToRunFromLeaderboard(item: RankedItem) {
    try {
      let current: RunItem[] = [];
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(RUN_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) current = parsed;
        }
      }

      if (current.some((r) => r.id === item.id)) {
        alert("This display is already in your run.");
        return;
      }

      // Use address as title, with fallback
      const rawAddress = (item.address || item.title || "").trim();
      const cleanedAddress = item.hide_number
        ? stripHouseNumber(rawAddress)
        : rawAddress;
      const displayAddress =
        cleanedAddress !== "" ? cleanedAddress : "Unnamed display";

      const next: RunItem[] = [
        ...current,
        {
          id: item.id,
          address: displayAddress,
          suburb: item.suburb,
          lat: item.lat,
          lng: item.lng,
        },
      ];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(RUN_KEY, JSON.stringify(next));
      }

      alert("Added to your run! Open the map to see it in My Run.");
    } catch {
      alert("Could not add to run.");
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 pt-20 pb-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#b00824] mb-2 text-center sm:text-left">
        CHRISTMAS LIGHTS LEADERBOARD
      </h1>
      <p className="text-sm text-gray-700 mb-4 text-center sm:text-left">
        See the top-voted displays and jump straight to them on the map.
      </p>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-3">
          <label className="text-sm text-gray-700 font-medium mb-2 sm:mb-0 sm:mr-2 text-center sm:text-left">
            Filter by suburb:
          </label>
          <select
            value={suburbFilterKey}
            onChange={(e) =>
              setSuburbFilterKey(e.target.value || "all")
            }
            className="border rounded-full px-3 py-1.5 text-sm bg-white shadow-sm w-full sm:w-auto"
          >
            <option value="all">All suburbs</option>
            {suburbOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {loading && <p className="text-sm text-gray-600">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-600">
          No displays found for that suburb yet.
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((item) => {
          const votesLabel =
            item.votes === 1 ? "1 vote" : `${item.votes} votes`;

          // 👉 Use address as the display title
          const rawAddress = (item.address || item.title || "").trim();
          const cleanedAddress = item.hide_number
            ? stripHouseNumber(rawAddress)
            : rawAddress;
          const displayTitle =
            cleanedAddress !== "" ? cleanedAddress : "Unnamed display";

          const isExpanded = expandedId === item.id;

          return (
            <article
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm border ${
                item.rank <= 3
                  ? "border-[#ffe2b5] bg-[#fffaf1]"
                  : "border-gray-100"
              } px-4 py-4 sm:px-5 sm:py-5`}
            >
              {/* Top row: rank + title, votes + vote button */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Rank badge */}
                  <div className="flex flex-col items-center mt-1 min-w-[36px]">
                    {item.rank <= 3 ? (
                      <div className="w-10 h-10 flex items-center justify-center text-2xl">
                        {item.rank === 1 && "🥇"}
                        {item.rank === 2 && "🥈"}
                        {item.rank === 3 && "🥉"}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-700 bg-white">
                        {item.rank}
                      </div>
                    )}
                  </div>

                  {/* Title (address) + suburb + (optional) expanded description */}
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg">
                      {displayTitle}
                    </h2>
                    {item.suburb && (
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {item.suburb}
                      </div>
                    )}

                    {/* Only show description when expanded */}
                    {isExpanded && item.description && (
                      <p className="mt-1 text-sm text-gray-700">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Votes + vote button */}
                <div className="flex flex-col items-end gap-1">
                  <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {votesLabel}
                  </div>
                  <Link
                    href={`/place/${item.id}?scrollTo=vote`}
                    className="text-[11px] uppercase tracking-wide border border-black rounded-full px-3 py-1 hover:bg-black hover:text-white transition"
                  >
                    Vote
                  </Link>
                </div>
              </div>

              {/* Buttons row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link
                  href={`/map?id=${item.id}`}
                  className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide rounded-full py-2 text-center shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #3d5654, #7e8c68)",
                    color: "#ffffff",
                  }}
                >
                  View on map
                </Link>

                {/* Details now toggles inline description */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                  className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide rounded-full py-2 text-center border border-gray-300 bg-white hover:bg-gray-50"
                >
                  {isExpanded ? "Hide details" : "Details"}
                </button>

                <button
                  type="button"
                  onClick={() => addToRunFromLeaderboard(item)}
                  className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide rounded-full py-2 text-center shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #7e0a17, #c4142d)",
                    color: "#ffffff",
                  }}
                >
                  Add to run
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
