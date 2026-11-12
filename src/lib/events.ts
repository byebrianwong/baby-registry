// Events: the types, labels and date helpers that the event pages, forms and
// emails share. Nothing here talks to the database, so it's safe in the
// browser. The tables are in supabase/migrations/015_events.sql and the server
// actions are in src/lib/actions/events.ts.

import { themeForTint, type OccasionTheme } from "@/lib/occasion-theme";
import { OCCASIONS, OCCASION_IDS, occasionFor, type OccasionId } from "@/lib/occasions";
import type { QuestionKind, RsvpAnswers, RsvpQuestion } from "@/lib/rsvp-questions";

/** Every event type: the occasions in src/lib/occasions.ts, in order. */
export const EVENT_TYPES = OCCASION_IDS;

export type EventType = OccasionId;

export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

export interface EventDetails {
  id: string;
  owner_id: string;
  /**
   * The one registry the old code linked. Kept until that code is gone; links
   * now live in event_registries (see getEventRegistries).
   */
  registry_id: string | null;
  slug: string;
  event_type: EventType;
  title: string;
  hosted_by: string | null;
  /** YYYY-MM-DD */
  event_date: string | null;
  /** HH:MM or HH:MM:SS, in the event's time zone. */
  start_time: string | null;
  end_time: string | null;
  /** An IANA time zone, like America/Los_Angeles. */
  time_zone: string | null;
  location_name: string | null;
  location_address: string | null;
  message: string | null;
  image_url: string | null;
  /** YYYY-MM-DD */
  rsvp_by: string | null;
  max_party_size: number;
  open_rsvp: boolean;
  email_host_on_rsvp: boolean;
  /** Shown with the gifts: "No gifts, please", "A book instead of a card". */
  gift_note: string | null;
  /** The RSVP asks how many of the party are kids. */
  ask_kids: boolean;
  /** The event this was copied from with "Plan it again". */
  repeated_from: string | null;
  /** The group its guests came from (src/lib/groups.ts), or null. */
  group_id?: string | null;
  /**
   * What the RSVP asks besides how many are coming (src/lib/rsvp-questions.ts).
   * Read it with storedQuestions, since it comes straight from the database.
   */
  rsvp_questions?: RsvpQuestion[];
  /** Email everyone going a reminder the day before. */
  remind_day_before?: boolean;
  /** The event date the last day-before reminder went out for. */
  reminded_for?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventGuest {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  token: string;
  rsvp_status: RsvpStatus;
  party_size: number;
  /** Of party_size, how many are kids. Only asked when the event asks. */
  kids_count: number;
  rsvp_note: string | null;
  responded_at: string | null;
  invited_at: string | null;
  reminded_at: string | null;
  added_by_guest: boolean;
  /** Joined the gift exchange. */
  in_exchange: boolean;
  wishlist_url: string | null;
  gift_ideas: string | null;
  shipping_address: string | null;
  /** The guest this one drew in the gift exchange. Only they see it. */
  giftee_id: string | null;
  /** Answers to the event's RSVP questions, by question id. Read with storedAnswers. */
  answers?: RsvpAnswers;
  created_at: string;
}

/** A registry an event links to, as its page shows it. */
export interface LinkedRegistry {
  title: string;
  slug: string;
}

/** Most guests one event can have. Keeps one event from sending thousands of emails. */
export const MAX_GUESTS_PER_EVENT = 300;

/** Most people one RSVP can count. Matches the check on events.max_party_size. */
export const MAX_PARTY_SIZE_LIMIT = 20;

export interface EventTypeOption {
  value: EventType;
  label: string;
  titlePlaceholder: string;
  /** What a new event of this type starts with. The host can change all of it. */
  defaults?: {
    giftNote?: string;
    askKids?: boolean;
    exchange?: boolean;
    /** A new event starts with this sign-up sheet (src/lib/signups.ts). */
    signup?: "potluck" | "meal_train";
    /** A new event's RSVP asks these (src/lib/rsvp-questions.ts). */
    questions?: QuestionKind[];
  };
}

// The buttons on the event form, in the order of src/lib/occasions.ts.
export const EVENT_TYPE_OPTIONS: EventTypeOption[] = OCCASIONS.map((occasion) => ({
  value: occasion.id,
  label: occasion.label,
  titlePlaceholder: occasion.titlePlaceholder,
  ...("defaults" in occasion ? { defaults: occasion.defaults } : {}),
}));

/** Ready-made gift notes the host can pick and then edit. */
export const GIFT_NOTE_PRESETS: { label: string; text: string }[] = [
  { label: "No gifts", text: "No gifts, please. Your company is the best present." },
  { label: "Book instead of a card", text: "Instead of a card, bring a favorite children's book with a note inside." },
  { label: "$5 party", text: "It's a fiver party: if you'd like to give something, put $5 in a card." },
  { label: "Bring a wrapped gift", text: "Bring one wrapped gift, around $25, for the gift swap." },
  { label: "In lieu of gifts", text: "In lieu of gifts, please consider a donation to a cause you care about." },
];

/** Longest gift note. Matches the check on events.gift_note. */
export const MAX_GIFT_NOTE_LENGTH = 500;

// ── Gift exchanges ───────────────────────────────────────────

export interface GiftExchange {
  event_id: string;
  /** As the host wrote it: "$25", "$20 to $30". */
  budget: string | null;
  /** YYYY-MM-DD: the day the host plans to draw names. */
  draw_by: string | null;
  /** No get-together: gifts are mailed, so everyone gives a shipping address. */
  mailed: boolean;
  drawn_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What a guest sees about the person they drew. */
export interface ExchangeGiftee {
  name: string;
  wishlistUrl: string | null;
  /** When the wishlist is a Regibee registry, its title. */
  wishlistTitle: string | null;
  giftIdeas: string | null;
  shippingAddress: string | null;
}

export const MIN_EXCHANGE_PARTICIPANTS = 3;

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}

export function eventTypeLabel(type: EventType): string {
  if (type === "other") return "Event";
  return EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Event";
}

/** An event's colors, from its occasion (src/lib/occasions.ts). */
export function eventTheme(type: EventType): OccasionTheme {
  return themeForTint(occasionFor(type).tint);
}

// ── Guests ───────────────────────────────────────────────────

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Can't go",
  pending: "No reply",
};

export interface RsvpSummary {
  /** Guests on the list. */
  guests: number;
  /** People coming: the party sizes of every "yes" added up. */
  attending: number;
  yes: number;
  maybe: number;
  /** People who said maybe, added up the same way. */
  maybeHeadcount: number;
  no: number;
  pending: number;
  /** Guests who have been emailed an invitation. */
  invited: number;
}

export function summarizeRsvps(
  guests: Pick<EventGuest, "rsvp_status" | "party_size" | "invited_at">[],
): RsvpSummary {
  const summary: RsvpSummary = {
    guests: guests.length,
    attending: 0,
    yes: 0,
    maybe: 0,
    maybeHeadcount: 0,
    no: 0,
    pending: 0,
    invited: 0,
  };
  for (const guest of guests) {
    summary[guest.rsvp_status] += 1;
    if (guest.rsvp_status === "yes") summary.attending += guest.party_size;
    if (guest.rsvp_status === "maybe") summary.maybeHeadcount += guest.party_size;
    if (guest.invited_at) summary.invited += 1;
  }
  return summary;
}

const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export interface ParsedGuest {
  name: string;
  email: string | null;
}

/**
 * Reads a pasted guest list, one guest per line. Understands the ways people
 * copy addresses: "Glinda Upland <glinda@example.com>", "Glinda, glinda@…",
 * a tab between them (from a spreadsheet), or a name or an address alone.
 * Lines it can't make sense of come back in `skipped`.
 */
export function parseGuestList(text: string): { guests: ParsedGuest[]; skipped: string[] } {
  const guests: ParsedGuest[] = [];
  const skipped: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const angle = line.match(/^(.*?)<\s*([^>]+?)\s*>\s*$/);
    let name: string;
    let email: string | null = null;
    if (angle) {
      name = angle[1].replace(/^["'\s]+|["',\s]+$/g, "");
      email = angle[2];
    } else {
      const found = line.match(/[^\s,;<>"]+@[^\s,;<>"]+/);
      if (found) {
        email = found[0];
        name = line.replace(found[0], "").replace(/^[\s,;\t"']+|[\s,;\t"']+$/g, "");
      } else {
        name = line.replace(/[\t,;]+/g, " ").trim();
      }
    }

    if (email && !isEmail(email)) {
      skipped.push(line);
      continue;
    }
    // An address alone: use the part before the @ until the host names them.
    if (!name && email) name = email.split("@")[0];
    if (!name || name.length > 100) {
      skipped.push(line);
      continue;
    }
    guests.push({ name, email: email ? email.toLowerCase() : null });
  }
  return { guests, skipped };
}

// ── Dates and times ──────────────────────────────────────────

/** "Saturday, March 14, 2026" */
export function formatEventDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat, Mar 14" */
export function formatShortEventDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** "2:00 PM", or "2 PM" on the hour. */
function formatClock(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  const suffix = parsed.hours >= 12 ? "PM" : "AM";
  const hours = parsed.hours % 12 || 12;
  return parsed.minutes === 0
    ? `${hours} ${suffix}`
    : `${hours}:${String(parsed.minutes).padStart(2, "0")} ${suffix}`;
}

export function isTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The zone's short name on that day, like "PDT", or null if Intl has none. */
function zoneAbbreviation(date: string, time: string, timeZone: string): string | null {
  try {
    const instant = zonedTimeToUtc(date, time, timeZone);
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * "2 – 5 PM PDT", "2:30 PM – 12 AM PST", "2 PM" or null when the event has no
 * start time. Times are shown in the event's own zone, as the host typed them.
 */
export function formatEventTime(
  event: Pick<EventDetails, "event_date" | "start_time" | "end_time" | "time_zone">,
): string | null {
  if (!event.start_time) return null;
  const start = formatClock(event.start_time);
  let text = start;
  if (event.end_time) {
    const end = formatClock(event.end_time);
    const startSuffix = start.slice(-2);
    // "2 – 5 PM" instead of "2 PM – 5 PM" when both are in the afternoon.
    text = end.endsWith(startSuffix)
      ? `${start.slice(0, -3)} – ${end}`
      : `${start} – ${end}`;
  }
  if (event.time_zone && event.event_date) {
    const zone = zoneAbbreviation(event.event_date, event.start_time, event.time_zone);
    if (zone) text = `${text} ${zone}`;
  }
  return text;
}

// The offset of a time zone from UTC at one instant, in milliseconds.
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instantMs;
}

/** The instant a wall-clock date and time happen in a time zone. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = parseTime(time) ?? { hours: 0, minutes: 0 };
  const guess = Date.UTC(year, month - 1, day, parsed.hours, parsed.minutes);
  const offset = zoneOffsetMs(guess, timeZone);
  let result = guess - offset;
  // Near a daylight saving change the offset at the answer can differ from
  // the offset at the guess. Correct once with the answer's own offset.
  const check = zoneOffsetMs(result, timeZone);
  if (check !== offset) result = guess - check;
  return new Date(result);
}

const DEFAULT_LENGTH_MS = 2 * 60 * 60 * 1000;

export type CalendarTimes =
  | { allDay: true; start: string; end: string }
  | { allDay: false; start: Date; end: Date };

/**
 * When the event starts and ends, for calendar apps. Null when it has no
 * date. With no start time it's an all-day event. With no end time, it
 * lasts two hours. With no time zone, UTC.
 */
export function calendarTimes(
  event: Pick<EventDetails, "event_date" | "start_time" | "end_time" | "time_zone">,
): CalendarTimes | null {
  if (!event.event_date) return null;
  if (!event.start_time) {
    const next = new Date(`${event.event_date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return {
      allDay: true,
      start: event.event_date.replaceAll("-", ""),
      end: next.toISOString().slice(0, 10).replaceAll("-", ""),
    };
  }
  const zone = event.time_zone && isTimeZone(event.time_zone) ? event.time_zone : "UTC";
  const start = zonedTimeToUtc(event.event_date, event.start_time, zone);
  let end = event.end_time
    ? zonedTimeToUtc(event.event_date, event.end_time, zone)
    : new Date(start.getTime() + DEFAULT_LENGTH_MS);
  // An end time earlier than the start runs past midnight.
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { allDay: false, start, end };
}

/** 20260314T210000Z */
export function calendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function eventLocationText(event: Pick<EventDetails, "location_name" | "location_address">): string {
  return [event.location_name, event.location_address?.replace(/\s*\n\s*/g, ", ")]
    .filter(Boolean)
    .join(", ");
}

/** A Google Calendar link that adds the event, or null when it has no date. */
export function googleCalendarUrl(
  event: Pick<
    EventDetails,
    "title" | "event_date" | "start_time" | "end_time" | "time_zone" | "location_name" | "location_address"
  >,
  eventUrl: string,
): string | null {
  const times = calendarTimes(event);
  if (!times) return null;
  const dates = times.allDay
    ? `${times.start}/${times.end}`
    : `${calendarStamp(times.start)}/${calendarStamp(times.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: `RSVP and details: ${eventUrl}`,
  });
  const location = eventLocationText(event);
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** A Google Maps search for the event's address, or null when it has none. */
export function mapsUrl(event: Pick<EventDetails, "location_name" | "location_address">): string | null {
  const query = event.location_address?.trim() ? eventLocationText(event) : null;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Whether the event's day is before `today` (both YYYY-MM-DD). */
export function eventHasPassed(event: Pick<EventDetails, "event_date">, today: string): boolean {
  return Boolean(event.event_date && event.event_date < today);
}

/** Common US time zones for the event form, plus whatever the browser is in. */
export const COMMON_TIME_ZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

// ── What hosts see ───────────────────────────────────────────

/**
 * A guest as the host's pages get them. The host never learns who drew
 * whom, and guests are told only their Secret Santa sees their wishlist,
 * ideas and address. So those are blanked before the page gets the guest.
 * The wishlist and ideas become "added" when the guest gave them, so the
 * host can see who still needs to.
 */
export function guestForHost(guest: EventGuest): EventGuest {
  return {
    ...guest,
    giftee_id: null,
    shipping_address: guest.shipping_address ? "added" : null,
    wishlist_url: guest.wishlist_url ? "added" : null,
    gift_ideas: guest.gift_ideas ? "added" : null,
  };
}

/** How a gift exchange stands, for the host, without saying who drew whom. */
export interface ExchangeStatus {
  participants: number;
  /** Participants who added a wishlist or gift ideas. */
  withWishlist: number;
  /** Participants with no email, who need their link texted to them. */
  withoutEmail: number;
  /** For a mailed exchange: participants with no shipping address. */
  withoutAddress: number;
  /**
   * After a draw, someone joined or left, so not everyone gives and receives
   * exactly once. The host should draw again.
   */
  stale: boolean;
}

export function exchangeStatus(guests: EventGuest[], exchange: Pick<GiftExchange, "drawn_at" | "mailed">): ExchangeStatus {
  const participants = guests.filter((g) => g.in_exchange);
  const ids = new Set(participants.map((g) => g.id));
  const receivers = new Set(participants.map((g) => g.giftee_id).filter((id): id is string => Boolean(id)));
  const stale =
    Boolean(exchange.drawn_at) &&
    (participants.some((g) => !g.giftee_id || !ids.has(g.giftee_id)) ||
      participants.some((g) => !receivers.has(g.id)) ||
      guests.some((g) => !g.in_exchange && g.giftee_id));
  return {
    participants: participants.length,
    withWishlist: participants.filter((g) => g.wishlist_url || g.gift_ideas).length,
    withoutEmail: participants.filter((g) => !g.email).length,
    withoutAddress: exchange.mailed ? participants.filter((g) => !g.shipping_address).length : 0,
    stale,
  };
}
