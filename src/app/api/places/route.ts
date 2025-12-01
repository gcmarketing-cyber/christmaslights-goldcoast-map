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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const season = detectSeason();

  // 1) Get all approved places for current season
  const { data: places, error } = await supabase
    .from("places")
    .select(
      "id, title, description, suburb, lat, lng, open_start, open_end, season, status, hide_number"
    )
    .eq("status", "approved")
    .eq("season", season);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filtered = places ?? [];

  // 2) Filter by "lights on now" if requested
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

  // 3) Load votes for these places
  const ids = filtered.map((p: any) => p.id);
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

  // 4) Work out top-10 ranks by votes
  //    (but keep ALL places in the result)
  const withVotes = filtered.map((p: any) => ({
    ...p,
    votes: voteMap.get(p.id) ?? 0,
  }));

  // sort descending by votes
  const sortedByVotes = [...withVotes].sort(
    (a, b) => (b.votes as number) - (a.votes as number)
  );

  const rankById = new Map<string, number>();
  sortedByVotes.slice(0, 10).forEach((p, idx) => {
    rankById.set(p.id, idx + 1); // 1..10
  });

  // 5) Build GeoJSON, attach rank ONLY for top 10
  const features = withVotes.map((p: any) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [p.lng, p.lat],
    },
    properties: {
      id: p.id,
      title: p.title,
      description: p.description,
      suburb: p.suburb,
      votes: p.votes,
      hide_number: p.hide_number === true,
      rank: rankById.get(p.id) ?? null, // <-- 1..10 or null
    },
  }));

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  });
}
