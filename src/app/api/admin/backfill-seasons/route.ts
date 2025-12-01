import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Update NULL seasons -> 'christmas' and return updated ids
  const { data, error } = await supabase
    .from("places")
    .update({ season: "christmas" })
    .is("season", null)
    .select("id"); // returns updated rows

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updated = Array.isArray(data) ? data.length : 0;
  return NextResponse.json({ ok: true, updated });
}
