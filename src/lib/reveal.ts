// When hidden gifts are revealed. A list that hides what's been reserved from
// its owner (src/lib/gifts.ts) shows them the gifts reserved before an event
// it's linked to from the day after that event. Nothing here talks to the
// database, so pages, emails and tests can all use it. The database has the
// same rule in gifts_revealed_through
// (supabase/migrations/20261114035445_everyone_gives_everyone.sql), and the
// two must agree.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The hour (UTC) of the day after an event when its gifts are revealed. At
 * 12:00 UTC it's the next day everywhere on earth, so nobody's gifts are
 * revealed while it's still the day of the event where they live.
 */
export const REVEAL_HOUR_UTC = 12;

/** YYYY-MM-DD plus a number of days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The day an event's gifts are revealed: the day after it. */
export function revealDateFor(eventDate: string): string {
  return addDays(eventDate, 1);
}

/** The moment an event's gifts are revealed. */
export function revealMomentFor(eventDate: string): Date {
  return new Date(Date.parse(`${revealDateFor(eventDate)}T00:00:00Z`) + REVEAL_HOUR_UTC * 60 * 60 * 1000);
}

export interface RevealEvent {
  title: string;
  /** YYYY-MM-DD, or null when the event has no date yet. */
  event_date: string | null;
}

/**
 * The next reveal among the events a list is linked to: the soonest event
 * whose gifts aren't revealed yet. Null when none is coming.
 */
export function nextReveal<E extends RevealEvent>(
  events: E[],
  now: Date = new Date(),
): { date: string; event: E } | null {
  let soonest: { date: string; event: E } | null = null;
  for (const event of events) {
    if (!event.event_date) continue;
    if (revealMomentFor(event.event_date).getTime() <= now.getTime()) continue;
    const date = revealDateFor(event.event_date);
    if (!soonest || date < soonest.date) soonest = { date, event };
  }
  return soonest;
}

/** "Dec 26", or "Dec 26, 2027" when it isn't this year. */
export function formatRevealDate(date: string, today: string): string {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
