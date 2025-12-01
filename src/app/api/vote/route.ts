import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest, { params }: any) {
  const placeId = Number(params.id);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const userId = user.id;

  // Check if vote already exists
  const { data: existingVote } = await supabase
    .from("votes")
    .select("*")
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .maybeSingle();

  if (existingVote) {
    // Remove the vote
    await supabase
      .from("votes")
      .delete()
      .eq("user_id", userId)
      .eq("place_id", placeId);
  } else {
    // Add the vote
    await supabase.from("votes").insert({
      user_id: userId,
      place_id: placeId,
    });
  }

  // Count updated votes
  const { count } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("place_id", placeId);

  return NextResponse.json({
    hasVoted: !existingVote,
    votes: count ?? 0,
  });
}
