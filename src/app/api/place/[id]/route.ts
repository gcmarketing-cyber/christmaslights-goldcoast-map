import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: NextRequest,
  context: any
) {
  // 👇 Pull id out safely regardless of how Next passes it
  const raw = context?.params?.id;

  let id = "";
  if (typeof raw === "string") {
    id = raw.trim();
  } else if (Array.isArray(raw) && raw[0]) {
    id = String(raw[0]).trim();
  }

  // If there's genuinely no usable id, just say "not found"
  if (!id || id === "undefined") {
    return NextResponse.json(
      { error: "Place not found" },
      { status: 404 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // 1) Fetch the place by id (approved only)
  const { data: place, error } = await supabase
    .from("places")
    .select(
      "id, title, description, suburb, season, status, open_start, open_end, hide_number"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!place || place.status !== "approved") {
    return NextResponse.json(
      { error: "Place not found" },
      { status: 404 }
    );
  }

  // 2) Fetch vote count
  let votes = 0;
  const { data: countRow, error: countError } = await supabase
    .from("vote_counts")
    .select("votes")
    .eq("place_id", id)
    .maybeSingle();

  if (!countError && countRow && typeof countRow.votes === "number") {
    votes = countRow.votes;
  }

  return NextResponse.json({
    id: place.id,
    address: place.title,
    description: place.description,
    suburb: place.suburb,
    season: place.season,
    open_start: place.open_start,
    open_end: place.open_end,
    hide_number: place.hide_number === true,
    votes,
  });
}
