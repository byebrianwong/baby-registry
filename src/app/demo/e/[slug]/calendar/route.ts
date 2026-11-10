import { icsResponse } from "@/lib/event-ics";
import { findDemoEvent } from "@/lib/demo-events";

// The demo event as an .ics file. Its dates count from today, like the page's.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const found = findDemoEvent(today, { slug });
  const event = found ? (({ guests: _guests, ...details }) => details)(found) : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return icsResponse(event, `${siteUrl}/demo/e/${slug}`);
}
