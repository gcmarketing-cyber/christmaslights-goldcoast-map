import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function detectSeason() {
  const month = new Date().getMonth() + 1;
  if (month === 9 || month === 10) return "halloween";
  if (month === 11 || month === 12) return "christmas";
  return "christmas";
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const openNow = search.get("openNow") === "true";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon);

  const season = detectSeason();

  // 1) get approved places for current season
  const { data: places, error } = await supabase
    .from("places")
    .select("id, title, description, lat, lng, open_start, open_end, season, status")
    .eq("status", "approved")
    .eq("season", season);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filtered = places ?? [];

  // 2) apply "open now" filter if requested
  if (openNow) {
    const now = new Date();
    const minsNow = now.getHours() * 60 + now.getMinutes();

    filtered = filtered.filter((p: any) => {
      if (!p.open_start || !p.open_end) return false;
      const [sH, sM] = p.open_start.split(":").map(Number);
      const [eH, eM] = p.open_end.split(":").map(Number);
      const startM = sH * 60 + sM;
      const endM = eH * 60 + eM;
      return minsNow >= startM && minsNow <= endM;
    });
  }

  // 3) fetch vote counts for these places
  const ids = filtered.map((p: any) => p.id);
  let voteMap = new Map<string, number>();

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

  // 4) build GeoJSON
  const features = filtered.map((p: any) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [p.lng, p.lat],
    },
    properties: {
      id: p.id,
      title: p.title,
      description: p.description,
      votes: voteMap.get(p.id) ?? 0,
    },
  }));

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  });
}
