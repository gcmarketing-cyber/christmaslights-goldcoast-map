"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email) {
      setError("Please enter an email.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login/confirm`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // store name temporarily, we upsert into profiles on confirm page
    localStorage.setItem("pending_user_name", name);

    setMessage(
      "Check your inbox and click the login link we’ve emailed to you. After that, your login will be complete."
    );
    setLoading(false);
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <div className="flex justify-center mb-4">
        <Logo variant="circle" theme="light" size="sm" />
      </div>

      <h1 className="text-xl font-semibold mb-4">Log in to vote</h1>

      <p className="text-sm mb-4 text-gray-600">
        Logging in is only required if you want to vote or access the admin
        area. Browsing the map and adding displays does not require an account.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Your name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Email address</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded text-sm disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send login link"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-100 text-red-800 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 p-3 rounded bg-green-100 text-green-800 border border-green-200 text-sm">
          {message}
        </div>
      )}
    </main>
  );
}
