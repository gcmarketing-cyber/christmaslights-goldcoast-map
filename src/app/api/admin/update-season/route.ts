// src/app/api/admin/update-season/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { id, season } = await req.json() as { id?: string; season?: string };
    if (!id || !["halloween", "christmas"].includes(season ?? "")) {
      return NextResponse.json({ error: "Missing id or invalid season" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { error } = await supabase.from("places").update({ season }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
