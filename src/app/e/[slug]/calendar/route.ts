import { supabaseAdmin } from "@/lib/supabase-admin";
import { icsResponse } from "@/lib/event-ics";
import type { EventDetails } from "@/lib/events";
import { withAddressFor } from "@/lib/signups";

// The event as an .ics file. Anyone with the event link can download it, like
// the page. It doesn't know who's asking, so a meal train's drop-off address,
// which only people who signed up see, is left out.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin.from("events").select("*").eq("slug", slug).maybeSingle();
  const event = data as EventDetails | null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return icsResponse(event ? withAddressFor(event, false) : null, `${siteUrl}/e/${slug}`);
}
