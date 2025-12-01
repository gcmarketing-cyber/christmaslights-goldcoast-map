"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

type FormState = {
  address: string;
  description: string;
  lat: string;
  lng: string;
  suburb: string;
  open_start: string;
  open_end: string;
  hide_number: boolean;
  owner_type: "owner" | "other";
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

export default function AddPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    address: "",
    description: "",
    lat: "-27.93",
    lng: "153.32",
    suburb: "",
    open_start: "",
    open_end: "",
    hide_number: false,
    owner_type: "owner",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setForm((f) => ({ ...f, [name]: checked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function onOwnerTypeChange(value: "owner" | "other") {
    setForm((f) => ({ ...f, owner_type: value }));
  }

  async function geocode() {
    if (!form.address.trim()) {
      setError("Please enter an address first.");
      return;
    }

    setLookupMsg("Looking up address…");
    setError(null);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(form.address)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupMsg(null);
        setError(data.error || "Address not found");
        return;
      }

      setForm((f) => ({
        ...f,
        lat: String(data.lat),
        lng: String(data.lng),
        suburb: data.suburb || f.suburb,
        address: data.place_name || f.address,
      }));
      setLookupMsg(`Found: ${data.place_name || "address"}`);
    } catch (e: any) {
      setLookupMsg(null);
      setError(e?.message || "Lookup failed");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          description: form.description,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          suburb: form.suburb || null,
          open_start: form.open_start || null,
          open_end: form.open_end || null,
          hide_number: form.hide_number,
          is_owner: form.owner_type === "owner",
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to save");
        setIsSubmitting(false);
        return;
      }

      setSaved(true);
      setTimeout(() => router.push("/map"), 1200);
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex justify-center mb-4">
        <Logo variant="circle" theme="light" size="sm" />
      </div>

      <h1 className="text-2xl font-semibold mb-2">Add a Display</h1>
      <p className="text-sm text-gray-700 mb-4">
        You don&apos;t need an account to add a display, but we do need your
        contact details so we can get in touch if your display wins a prize.
      </p>

      <form className="space-y-5" onSubmit={onSubmit}>
        {/* About you */}
        <section className="border rounded-xl p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-3">About you</h2>

          <div className="mb-3">
            <div className="text-sm font-medium mb-1">
              Is this <span className="underline">your</span> house?
            </div>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="owner_type"
                  value="owner"
                  checked={form.owner_type === "owner"}
                  onChange={() => onOwnerTypeChange("owner")}
                />
                <span>Yes, this is my house</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="owner_type"
                  value="other"
                  checked={form.owner_type === "other"}
                  onChange={() => onOwnerTypeChange("other")}
                />
                <span>No, I&apos;m nominating someone else</span>
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Your name
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                name="contact_name"
                value={form.contact_name}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Email address
              </label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2 text-sm"
                name="contact_email"
                value={form.contact_email}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block mb-1 text-sm font-medium">
              Phone
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              name="contact_phone"
              value={form.contact_phone}
              onChange={onChange}
              placeholder="So we can reach you quickly if needed"
              required
            />
          </div>
        </section>

        {/* Display details */}
        <section className="border rounded-xl p-4 bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold mb-3">Display details</h2>

          <div>
            <label className="block mb-1 text-sm font-medium">Address</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm"
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="e.g., 34 Annerley Road, Woolloongabba"
                required
              />
              <button
                type="button"
                onClick={geocode}
                className="px-3 py-2 rounded bg-gray-200 text-sm"
              >
                Find on map
              </button>
            </div>
            {lookupMsg && (
              <div className="text-xs text-gray-600 mt-1">{lookupMsg}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Suburb</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                name="suburb"
                value={form.suburb}
                onChange={onChange}
                placeholder="Will auto-fill from address lookup where possible"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Description
            </label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              name="description"
              value={form.description}
              onChange={onChange}
              rows={3}
              placeholder="Any fun details (themes, synchronised lights, charity, etc.)"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Latitude
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                name="lat"
                value={form.lat}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Longitude
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                name="lng"
                value={form.lng}
                onChange={onChange}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Open from
              </label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2 text-sm"
                name="open_start"
                value={form.open_start}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                Open until
              </label>
              <input
                type="time"
                className="w-full border rounded px-3 py-2 text-sm"
                name="open_end"
                value={form.open_end}
                onChange={onChange}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm mt-2">
            <input
              type="checkbox"
              name="hide_number"
              checked={form.hide_number}
              onChange={onChange}
            />
            <span>
              Hide the exact house number on the public map & leaderboard
              (street name + suburb only)
            </span>
          </label>
        </section>

        <button
  type="submit"
  disabled={isSubmitting}
  className="mt-2 btn-xmas disabled:opacity-60"
>

          {isSubmitting ? "Saving…" : "Submit for approval"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-100 text-red-800 border border-red-200">
          Error: {error}
        </div>
      )}

      {saved && (
        <div className="mt-4 p-3 rounded bg-green-100 text-green-800 border border-green-200">
          Thanks! Your display has been submitted and will appear on the map
          once approved.
        </div>
      )}
    </main>
  );
}
