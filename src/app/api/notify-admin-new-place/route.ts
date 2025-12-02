import { NextRequest, NextResponse } from "next/server";

const FUNCTION_URL =
  "https://iyocxqrdnixkjgxshwzd.functions.supabase.co/notify-admin-new-place";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Supabase Edge Functions expect a bearer token, anon is fine for this
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Edge function failed:", text);
      return NextResponse.json(
        { ok: false, error: "Edge function error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("notify-admin-new-place API error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
