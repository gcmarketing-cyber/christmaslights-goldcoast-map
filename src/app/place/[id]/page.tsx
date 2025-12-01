"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Logo } from "@/components/Logo";

type Row = {
  id: string;
  address: string;
  description: string | null;
  suburb: string | null;
  hide_number: boolean;
  open_start: string | null;
  open_end: string | null;
  votes: number;
};

function stripHouseNumber(address: string) {
  return address.replace(/^\s*\d+\s+/, "");
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [hh, mm] = t.split(":");
  if (!hh || !mm) return t;
  return `${hh}:${mm}`;
}

export default function PlacePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [place, setPlace] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setErr("Missing place ID in URL");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/leaderboard");
        const body = await res.json();
        if (!res.ok) {
          setErr(body.error || "Failed to load place");
          setLoading(false);
          return;
        }

        const rows: Row[] = (Array.isArray(body) ? body : []).map((r: any) => ({
          id: String(r.id),
          address: String(r.address ?? ""),
          description: r.description ?? null,
          suburb: r.suburb ?? null,
          hide_number: !!r.hide_number,
          open_start: r.open_start ?? null,
          open_end: r.open_end ?? null,
          votes: r.votes ?? 0,
        }));

        const match = rows.find((r) => r.id === id) ?? null;
        if (!match) {
          setErr("Place not found");
          setLoading(false);
          return;
        }

        setPlace(match);
      } catch (e: any) {
        setErr(e?.message || "Failed to load place");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const publicAddress =
    place && place.hide_number
      ? stripHouseNumber(place.address)
      : place?.address;

  const openStart = formatTime(place?.open_start ?? null);
  const openEnd = formatTime(place?.open_end ?? null);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <Logo variant="circle" theme="light" size="sm" href="/map" />

        <div className="flex gap-2">
          <Link
            href="/map"
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
          >
            Back to map
          </Link>
          {place && (
            <Link
              href={`/map?id=${place.id}`}
              className="px-3 py-1.5 rounded bg-black text-white text-sm"
            >
              View on map
            </Link>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-semibold mb-3">Display details</h1>

      {loading && (
        <div className="p-3 bg-gray-50 border rounded">Loading…</div>
      )}

      {err && !loading && (
        <div className="p-3 bg-red-100 border border-red-200 rounded text-red-800">
          Error: {err}
        </div>
      )}

      {!loading && !err && place && (
        <div className="space-y-4">
          <section className="border rounded-xl p-4 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-1">{publicAddress}</h2>
            {place.suburb && (
              <div className="text-sm text-gray-600 mb-2">
                {place.suburb}
              </div>
            )}

            {place.description && (
              <p className="text-sm text-gray-800 mb-3">
                {place.description}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <div>
                <span className="font-medium">Votes:</span>{" "}
                {place.votes} vote{place.votes === 1 ? "" : "s"}
              </div>

              {openStart && openEnd && (
                <div>
                  <span className="font-medium">Open:</span>{" "}
                  {openStart} – {openEnd}
                </div>
              )}
            </div>

            {place.hide_number && (
              <p className="mt-3 text-xs text-gray-500">
                Exact house number is hidden on the public map &amp;
                leaderboard.
              </p>
            )}
          </section>

          <section className="text-xs text-gray-500">
            Share this page with friends so they can see the details and jump
            straight to the map.
          </section>
        </div>
      )}

      {!loading && !err && !place && (
        <div className="p-3 bg-gray-50 border rounded text-gray-600">
          This display could not be found.
        </div>
      )}
    </main>
  );
}
