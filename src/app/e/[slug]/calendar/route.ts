import { supabaseAdmin } from "@/lib/supabase-admin";
import { calendarStamp, calendarTimes, eventLocationText, type EventDetails } from "@/lib/events";

// The event as an .ics file, for Apple Calendar, Outlook and anything else
// that isn't Google. Anyone with the event link can download it, like the page.

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 bytes are folded onto lines that start with a space.
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin.from("events").select("*").eq("slug", slug).maybeSingle();
  const event = data as EventDetails | null;
  const times = event ? calendarTimes(event) : null;
  if (!event || !times) {
    return new Response("This event has no date yet.", { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const eventUrl = `${siteUrl}/e/${event.slug}`;
  const location = eventLocationText(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Regibee//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@regibee.com`,
    `DTSTAMP:${calendarStamp(new Date(event.updated_at))}`,
    times.allDay ? `DTSTART;VALUE=DATE:${times.start}` : `DTSTART:${calendarStamp(times.start)}`,
    times.allDay ? `DTEND;VALUE=DATE:${times.end}` : `DTEND:${calendarStamp(times.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
    `DESCRIPTION:${escapeIcs(`RSVP and details: ${eventUrl}`)}`,
    `URL:${eventUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
