"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cleaned = email.trim();

    // 🚫 Prevents bad emails going to Supabase
    if (!emailRegex.test(cleaned)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithOtp({
      email: cleaned,
      options: {
        emailRedirectTo: `${window.location.origin}/map`
      }
    });

    setLoading(false);

    if (error) {
      setError("Could not send the link. Please try again.");
    } else {
      setSent(true);
    }
  }

  return (
    <div className="max-w-md mx-auto pt-28 pb-10 px-6 text-center">
      {!sent ? (
        <>
          <h1 className="text-2xl font-bold mb-4">Verify your email to vote</h1>

          <p className="text-gray-600 text-sm mb-6">
            To keep voting fair and prevent spam, we use secure
            one-time email links instead of passwords.
            <br />
            Enter your email and we'll send you a verification link.
          </p>

          <form onSubmit={sendMagicLink} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full border rounded px-3 py-2"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c4142d] text-white py-2 rounded hover:bg-[#a51225] transition"
            >
              {loading ? "Sending..." : "Send me a secure link"}
            </button>
          </form>
        </>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Check your email 📬</h2>
          <p className="text-gray-600 text-sm">
            We've sent a secure link to <strong>{email}</strong>.<br />
            Click it to verify your email and start voting.
          </p>
        </div>
      )}
    </div>
  );
}
