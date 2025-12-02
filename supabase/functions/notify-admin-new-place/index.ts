// supabase/functions/notify-admin-new-place/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");

// Your admin emails
const ADMIN_EMAILS = [
  "goldcoast@allpropertiesgroup.com.au",
  "gc.marketing@allpropertiesgroup.com.au",
  "nathan.simon@allpropertiesgroup.com.au",
  "nathan@allpropertiesgroup.com.au"
];

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // We will send the place data as JSON from the trigger
  const place = payload ?? {};
  const title = place.title ?? "New display";
  const suburb = place.suburb ?? "";
  const season = place.season ?? "";
  const id = place.id;

  const subject = `New ${season || "Christmas"} display awaiting approval`;
  const adminPageUrl = "https://christmaslights-goldcoast.au/admin";

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111;">
      <p>Hi team,</p>
      <p>A new display has been submitted and is awaiting approval.</p>
      <ul>
        <li><strong>ID:</strong> ${id ?? "(unknown)"}</li>
        <li><strong>Title:</strong> ${title}</li>
        <li><strong>Suburb:</strong> ${suburb || "(not set)"}</li>
        <li><strong>Season:</strong> ${season || "christmas"}</li>
      </ul>
      <p>You can review and approve it in the admin panel:</p>
      <p><a href="${adminPageUrl}">${adminPageUrl}</a></p>
      <p style="margin-top: 16px;">— Christmas Lights Gold Coast</p>
    </div>
  `;

  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error("RESEND_API_KEY is not set");
      return new Response("Missing RESEND_API_KEY", { status: 500 });
    }

    await resend.emails.send({
      // Using Resend's default from domain so you don't have to verify a domain right now
      from: "Christmas Lights GC <onboarding@resend.dev>",
      to: ADMIN_EMAILS,
      subject,
      html,
    });

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Email send error:", err);
    return new Response("Email failed", { status: 500 });
  }
});
