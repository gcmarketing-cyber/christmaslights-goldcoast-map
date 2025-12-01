import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function detectSeason(): "halloween" | "christmas" {
  const m = new Date().getMonth() + 1;
  if (m === 9 || m === 10) return "halloween";
  if (m === 11 || m === 12) return "christmas";
  return "christmas";
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    address,
    description,
    lat,
    lng,
    suburb,
    open_start,
    open_end,
    hide_number,
    is_owner,
    contact_name,
    contact_email,
    contact_phone,
  } = body;

  if (!address || typeof address !== "string") {
    return NextResponse.json(
      { error: "Address is required" },
      { status: 400 }
    );
  }
  if (!contact_name || !contact_email) {
    return NextResponse.json(
      { error: "Contact name and email are required" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const season = detectSeason();

  const { data, error } = await supabase
    .from("places")
    .insert({
      title: address, // we treat title as the full address string
      description: description || null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      suburb: suburb || null,
      open_start: open_start ? `${open_start}:00` : null,
      open_end: open_end ? `${open_end}:00` : null,
      hide_number: !!hide_number,
      season,
      status: "pending",
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      is_owner: !!is_owner,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, place: data });
}
