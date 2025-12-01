"use client";

import { useEffect, useState } from "react";

type AdminPlace = {
  id: string;
  address: string;
  suburb: string | null;
  description: string | null;
  season: string;
  status: string;
  open_start: string | null;
  open_end: string | null;
  hide_number: boolean | null;
  created_at: string;

  // Contact info
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_owner: boolean | null;
};

export default function AdminPage() {
  const [pending, setPending] = useState<AdminPlace[]>([]);
  const [approved, setApproved] = useState<AdminPlace[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔎 Search + Filters
  const [search, setSearch] = useState("");
  const [filterSeason, setFilterSeason] = useState<"all" | "christmas" | "halloween">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterSuburb, setFilterSuburb] = useState<string>("all");

  // 🔽 Collapsible sections
  const [pendingOpen, setPendingOpen] = useState(true);
  const [approvedOpen, setApprovedOpen] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/list");
      const body = await res.json();

      if (!res.ok) {
        setErr(body.error || "Failed to load admin list.");
        setLoading(false);
        return;
      }

      setPending(body.pending || []);
      setApproved(body.approved || []);
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message || "Loading failed.");
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const body = await res.json();

      if (!res.ok) {
        setErr(body.error || "Failed to update");
        return;
      }

      setMsg(`Updated display to ${status}`);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to update");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 🏙 Extract list of suburbs across both pending + approved
  const allSuburbs = Array.from(
    new Set(
      [...pending, ...approved]
        .map((p) => p.suburb)
        .filter((s): s is string => Boolean(s))
    )
  ).sort();

  // Helper: full address string
  function getFullAddress(p: AdminPlace): string {
    const address = p.address ?? "";
    const suburbPart = p.suburb ? `, ${p.suburb}` : "";
    return `${address}${suburbPart}`;
  }

  // Helper: Google Maps search URL
  function getGoogleMapsUrl(p: AdminPlace): string {
    const full = getFullAddress(p);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      full
    )}`;
  }

  // Helper: copy address
  async function handleCopyAddress(p: AdminPlace) {
    const full = getFullAddress(p);
    try {
      await navigator.clipboard.writeText(full);
      setMsg(`Copied "${full}" to clipboard`);
    } catch {
      setMsg("Could not copy to clipboard. Please copy manually.");
    }
  }

  // 🔄 Helper: apply searching + filtering + sorting
  function process(list: AdminPlace[]): AdminPlace[] {
    let result = [...list];

    // Filter by suburb
    if (filterSuburb !== "all") {
      result = result.filter((p) => p.suburb === filterSuburb);
    }

    // Filter by season
    if (filterSeason !== "all") {
      result = result.filter((p) => p.season === filterSeason);
    }

    // Search
    const q = search.toLowerCase();
    if (q.trim() !== "") {
      result = result.filter(
        (p) =>
          p.address?.toLowerCase().includes(q) ||
          p.suburb?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.contact_name?.toLowerCase().includes(q) ||
          p.contact_email?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const dA = new Date(a.created_at).getTime();
      const dB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dB - dA : dA - dB;
    });

    return result;
  }

  const pendingProcessed = process(pending);
  const approvedProcessed = process(approved);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin — Manage Displays</h1>

      {/* 🔎 SEARCH + FILTERS */}
      <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm">
        {/* Search */}
        <div className="mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address, suburb, name, email…"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          {/* Season Filter */}
          <select
            value={filterSeason}
            onChange={(e) =>
              setFilterSeason(e.target.value as "all" | "christmas" | "halloween")
            }
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All seasons</option>
            <option value="christmas">Christmas</option>
            <option value="halloween">Halloween</option>
          </select>

          {/* Suburb Filter */}
          <select
            value={filterSuburb}
            onChange={(e) => setFilterSuburb(e.target.value || "all")}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">All suburbs</option>
            {allSuburbs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "newest" | "oldest")
            }
            className="border rounded-lg px-3 py-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="p-3 mb-4 rounded bg-red-100 border border-red-300 text-red-800">
          {err}
        </div>
      )}

      {msg && (
        <div className="p-3 mb-4 rounded bg-green-100 border border-green-300 text-green-800">
          {msg}
        </div>
      )}

      {loading && <p>Loading…</p>}

      {!loading && (
        <>
          {/* Pending section */}
          <section className="mb-10">
            <div
              className="flex items-center justify-between mb-3 cursor-pointer select-none"
              onClick={() => setPendingOpen((o) => !o)}
            >
              <h2 className="text-xl font-semibold">
                Pending Approval ({pendingProcessed.length})
              </h2>
              <span
                className={`transition-transform ${
                  pendingOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                ▼
              </span>
            </div>

            {pendingProcessed.length === 0 && (
              <p className="text-sm text-gray-500">
                No pending displays (after filters).
              </p>
            )}

            <div
              className="space-y-4 transition-all duration-300"
              style={{
                maxHeight: pendingOpen ? "2000px" : "0px",
                overflow: "hidden",
                opacity: pendingOpen ? 1 : 0,
              }}
            >
              {pendingProcessed.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-white rounded-xl border mb-3 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      {/* ADDRESS */}
                      <div className="font-semibold text-base">
                        {p.hide_number
                          ? p.address.replace(/^\d+\s*/, "")
                          : p.address}
                      </div>

                      {/* SUBURB */}
                      {p.suburb && (
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          {p.suburb}
                        </div>
                      )}

                      {/* SEASON */}
                      <div className="text-xs text-gray-400 mt-1">
                        Season: {p.season}
                      </div>
                    </div>

                    {/* STATUS BADGE */}
                    <span className="text-yellow-700 bg-yellow-100 border border-yellow-200 text-xs px-2 py-1 rounded-full">
                      PENDING
                    </span>
                  </div>

                  {/* DESCRIPTION */}
                  {p.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  {/* CONTACT BLOCK */}
                  <div className="text-xs text-gray-600 mb-3 space-y-1 border-t pt-3">
                    <div>
                      <strong>Name:</strong> {p.contact_name || "—"}
                    </div>
                    <div>
                      <strong>Email:</strong> {p.contact_email || "—"}
                    </div>
                    <div>
                      <strong>Phone:</strong> {p.contact_phone || "—"}
                    </div>
                    <div>
                      <strong>Owner?</strong> {p.is_owner ? "Yes" : "Nominated"}
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(p)}
                      className="underline hover:text-gray-800"
                    >
                      Copy address
                    </button>
                    <a
                      href={getGoogleMapsUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-800"
                    >
                      Open in Google Maps
                    </a>
                    <a
                      href={`/map?id=${p.id}`}
                      className="underline hover:text-gray-800"
                    >
                      Open on map
                    </a>
                    <a
                      href={`/place/${p.id}`}
                      className="underline hover:text-gray-800"
                    >
                      View full details
                    </a>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateStatus(p.id, "approved")}
                      className="px-3 py-1.5 rounded-full bg-green-600 text-white text-xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(p.id, "rejected")}
                      className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Approved section */}
          <section>
            <div
              className="flex items-center justify-between mb-3 cursor-pointer select-none"
              onClick={() => setApprovedOpen((o) => !o)}
            >
              <h2 className="text-xl font-semibold">
                Approved Displays ({approvedProcessed.length})
              </h2>
              <span
                className={`transition-transform ${
                  approvedOpen ? "rotate-180" : "rotate-0"
                }`}
              >
                ▼
              </span>
            </div>

            {approvedProcessed.length === 0 && (
              <p className="text-sm text-gray-500">
                No approved displays (after filters).
              </p>
            )}

            <div
              className="space-y-4 transition-all duration-300"
              style={{
                maxHeight: approvedOpen ? "2000px" : "0px",
                overflow: "hidden",
                opacity: approvedOpen ? 1 : 0,
              }}
            >
              {approvedProcessed.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-white rounded-xl border mb-3 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-base">
                        {p.hide_number
                          ? p.address.replace(/^\d+\s*/, "")
                          : p.address}
                      </div>

                      {p.suburb && (
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          {p.suburb}
                        </div>
                      )}

                      <div className="text-xs text-gray-400 mt-1">
                        Season: {p.season}
                      </div>
                    </div>

                    {/* STATUS BADGE */}
                    <span className="text-green-700 bg-green-100 border border-green-200 text-xs px-2 py-1 rounded-full">
                      APPROVED
                    </span>
                  </div>

                  {/* CONTACT */}
                  <div className="text-xs text-gray-600 mb-3 space-y-1 border-t pt-3">
                    <div>
                      <strong>Name:</strong> {p.contact_name || "—"}
                    </div>
                    <div>
                      <strong>Email:</strong> {p.contact_email || "—"}
                    </div>
                    <div>
                      <strong>Phone:</strong> {p.contact_phone || "—"}
                    </div>
                    <div>
                      <strong>Owner?</strong> {p.is_owner ? "Yes" : "Nominated"}
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(p)}
                      className="underline hover:text-gray-800"
                    >
                      Copy address
                    </button>
                    <a
                      href={getGoogleMapsUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-800"
                    >
                      Open in Google Maps
                    </a>
                    <a
                      href={`/map?id=${p.id}`}
                      className="underline hover:text-gray-800"
                    >
                      Open on map
                    </a>
                    <a
                      href={`/place/${p.id}`}
                      className="underline hover:text-gray-800"
                    >
                      View full details
                    </a>
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateStatus(p.id, "rejected")}
                      className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
