import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function detectSeason() {
  const month = new Date().getMonth() + 1;
  if (month === 9 || month === 10) return "halloween";
  if (month === 11 || month === 12) return "christmas";
  return "christmas";
}

export async function GET(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const season = detectSeason();

  const { data: places, error } = await supabase
    .from("places")
    .select(
      "id, title, description, suburb, season, status, hide_number, open_start, open_end"
    )
    .eq("status", "approved")
    .eq("season", season);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = places ?? [];

  const ids = list.map((p: any) => p.id).filter(Boolean);
  const voteMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: counts, error: countsError } = await supabase
      .from("vote_counts")
      .select("place_id, votes")
      .in("place_id", ids);

    if (countsError) {
      return NextResponse.json({ error: countsError.message }, { status: 500 });
    }

    (counts ?? []).forEach((c: any) => {
      voteMap.set(c.place_id, c.votes);
    });
  }

  const rows = list
    .filter((p: any) => !!p.id)
    .map((p: any) => ({
      id: String(p.id),
      address: String(p.title ?? ""),
      description: p.description ?? null,
      suburb: p.suburb ?? null,
      hide_number: p.hide_number === true,
      open_start: p.open_start ?? null,
      open_end: p.open_end ?? null,
      votes: voteMap.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return NextResponse.json(rows);
}
