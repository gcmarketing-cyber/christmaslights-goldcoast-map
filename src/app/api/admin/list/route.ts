import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(_req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase environment variables not set" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("places")
      .select(
        [
          "id",
          "title",
          "description",
          "suburb",
          "season",
          "status",
          "open_start",
          "open_end",
          "hide_number",
          "created_at",
          "contact_name",
          "contact_email",
          "contact_phone",
          "is_owner",
        ].join(", ")
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 👇 Cast to any[] so TS stops treating it as GenericStringError
    const rows = ((data ?? []) as any[]).map((p) => ({
      id: p.id as string,
      address: (p as any).title as string,
      description: (p as any).description ?? null,
      suburb: (p as any).suburb ?? null,
      season: (p as any).season ?? "",
      status: (p as any).status ?? "",
      open_start: (p as any).open_start ?? null,
      open_end: (p as any).open_end ?? null,
      hide_number: (p as any).hide_number ?? null,
      created_at: (p as any).created_at ?? null,
      contact_name: (p as any).contact_name ?? null,
      contact_email: (p as any).contact_email ?? null,
      contact_phone: (p as any).contact_phone ?? null,
      is_owner: (p as any).is_owner ?? null,
    }));

    const pending = rows.filter((r) => r.status === "pending");
    const approved = rows.filter((r) => r.status === "approved");

    return NextResponse.json({ pending, approved });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error in admin list" },
      { status: 500 }
    );
  }
}
