import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("places")
      .select(
        `
        id,
        title,
        description,
        suburb,
        season,
        status,
        open_start,
        open_end,
        hide_number,
        created_at,
        contact_name,
        contact_email,
        contact_phone,
        is_owner
      `
      )
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("admin/list error:", error.message);
      return NextResponse.json(
        { error: "Failed to load places" },
        { status: 500 }
      );
    }

    const pending = (data || []).filter((p) => p.status === "pending");
    const approved = (data || []).filter((p) => p.status === "approved");

    return NextResponse.json({ pending, approved });
  } catch (e: any) {
    console.error("admin/list crash:", e?.message || e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
