import { calendarStamp, calendarTimes, eventLocationText, type EventDetails } from "@/lib/events";

// An event as an .ics file, for Apple Calendar, Outlook and anything else that
// isn't Google. The event page's calendar route and the demo's use it.

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
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

/** The .ics file's text, or null when the event has no date yet. `eventUrl` is the event page. */
export function eventIcs(event: EventDetails, eventUrl: string): string | null {
  const times = calendarTimes(event);
  if (!times) return null;

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
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The response for an event's .ics link. */
export function icsResponse(event: EventDetails | null, eventUrl: string): Response {
  const ics = event ? eventIcs(event, eventUrl) : null;
  if (!event || !ics) {
    return new Response("This event has no date yet.", { status: 404 });
  }
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
