import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const token =
    process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token === "test") {
    return NextResponse.json(
      { error: "Mapbox token not configured" },
      { status: 500 }
    );
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    q
  )}.json?access_token=${token}&limit=1&country=AU`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Geocoding request failed" },
      { status: 500 }
    );
  }

  const data = await res.json();
  const feature = data.features?.[0];

  if (!feature) {
    return NextResponse.json(
      { error: "No results found" },
      { status: 404 }
    );
  }

  const [lng, lat] = feature.center || [];
  const place_name = feature.place_name || "";

  // suburb from context
  let suburb: string | null = null;
  if (Array.isArray(feature.context)) {
    for (const c of feature.context) {
      const id: string = c.id || "";
      if (
        id.startsWith("locality.") ||
        id.startsWith("place.") ||
        id.startsWith("neighborhood.") ||
        id.startsWith("district.")
      ) {
        suburb = c.text;
        break;
      }
    }
  }
  if (!suburb && typeof feature.text === "string") {
    suburb = feature.text;
  }

  // Canonical address: "<number> <street name>"
  const houseNumber = feature.address; // e.g. "34"
  const streetName = feature.text;     // e.g. "Annerley Road"
  let canonical_address: string;

  if (houseNumber && streetName) {
    canonical_address = `${houseNumber} ${streetName}`; // "34 Annerley Road"
  } else if (place_name) {
    canonical_address = place_name.split(",")[0]; // first part before suburb/state
  } else {
    canonical_address = q;
  }

  return NextResponse.json({
    lat,
    lng,
    place_name,
    suburb,
    canonical_address,
  });
}
