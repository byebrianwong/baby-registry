// Sign-up sheets on events (#99): things to bring ("Sides, 3 needed") and
// time slots ("Tue Nov 18, dinner"). Guests claim rows when they RSVP. The
// tables are in supabase/migrations/20261112050910_signup_sheets.sql, reads in
// src/lib/events-server.ts, the host's changes in src/lib/actions/signups.ts
// and guests' claims in submitRsvp (src/lib/actions/events.ts).
//
// This file has no imports, so the browser, the server and tests can all use it.

export const MAX_SIGNUP_ROWS = 60;
export const MAX_SIGNUP_NEEDED = 50;
export const MAX_SIGNUP_TITLE_LENGTH = 80;
export const MAX_SIGNUP_NOTE_LENGTH = 500;
export const MAX_SIGNUP_LABEL_LENGTH = 100;
export const MAX_CLAIM_NOTE_LENGTH = 200;
/** Most days "Add a row for each day" makes at once. */
export const MAX_SIGNUP_DAYS = 31;

export interface SignupSheet {
  event_id: string;
  title: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignupItem {
  id: string;
  event_id: string;
  label: string;
  /** YYYY-MM-DD, for a meal train day or a volunteer shift. */
  slot_date: string | null;
  needed: number;
  sort_order: number;
  created_at: string;
}

export interface SignupClaim {
  item_id: string;
  guest_id: string;
  /** What they're bringing: "Mac and cheese". */
  note: string | null;
  created_at: string;
}

/** A sheet with its rows and every claim on them. */
export interface SignupSheetWithRows {
  sheet: SignupSheet;
  items: SignupItem[];
  claims: SignupClaim[];
}

// ── Starting a sheet ─────────────────────────────────────────

export type SignupPreset = "potluck" | "meal_train" | "volunteer" | "blank";

export interface NewSignupRow {
  label: string;
  needed: number;
  slot_date?: string | null;
}

export const SIGNUP_PRESETS: Record<
  SignupPreset,
  { label: string; hint: string; title: string; note: string | null; rows: NewSignupRow[] }
> = {
  potluck: {
    label: "Potluck",
    hint: "Mains, sides, desserts and drinks",
    title: "Bring a dish",
    note: "Pick what you'll bring and say what it is, so we don't end up with five pasta salads.",
    rows: [
      { label: "Main dish", needed: 2 },
      { label: "Side", needed: 3 },
      { label: "Dessert", needed: 2 },
      { label: "Drinks", needed: 2 },
    ],
  },
  meal_train: {
    label: "Meal train",
    hint: "A meal on each day you choose",
    title: "Meals",
    note: "Pick a day to drop off a meal. You'll see the address once you sign up.",
    rows: [],
  },
  volunteer: {
    label: "Volunteers",
    hint: "Setting up, cleaning up and other jobs",
    title: "Help out",
    note: null,
    rows: [
      { label: "Set up", needed: 2 },
      { label: "Clean up", needed: 2 },
    ],
  },
  blank: {
    label: "Start empty",
    hint: "Add your own rows",
    title: "Sign-up sheet",
    note: null,
    rows: [],
  },
};

export function isSignupPreset(value: unknown): value is SignupPreset {
  return typeof value === "string" && value in SIGNUP_PRESETS;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** The day after a YYYY-MM-DD date. */
function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * One row for each day from `from` to `to`, both included: a meal train's
 * dinners, or a week of volunteer shifts. Null when the dates don't make sense
 * or cover more than MAX_SIGNUP_DAYS days.
 */
export function rowsForDays(from: string, to: string, label: string, needed = 1): NewSignupRow[] | null {
  if (!isDateString(from) || !isDateString(to) || to < from) return null;
  const rows: NewSignupRow[] = [];
  for (let day = from; day <= to; day = nextDay(day)) {
    if (rows.length === MAX_SIGNUP_DAYS) return null;
    rows.push({ label, needed, slot_date: day });
  }
  return rows;
}

/** A row as the host typed it, trimmed and checked. */
export function cleanSignupRow(row: { label?: unknown; needed?: unknown; slot_date?: unknown }): NewSignupRow | { error: string } {
  const label = typeof row.label === "string" ? row.label.trim().slice(0, MAX_SIGNUP_LABEL_LENGTH) : "";
  if (!label) return { error: "Give each row a name, like \"Sides\" or \"Dinner\"." };
  const needed = Math.round(Number(row.needed ?? 1));
  if (!Number.isFinite(needed) || needed < 1 || needed > MAX_SIGNUP_NEEDED) {
    return { error: `Each row needs between 1 and ${MAX_SIGNUP_NEEDED} people.` };
  }
  const date = row.slot_date === "" || row.slot_date == null ? null : row.slot_date;
  if (date !== null && !isDateString(date)) return { error: "That date doesn't look right." };
  return { label, needed, slot_date: date };
}

/** Rows in the order guests see them: dated rows by date, then the rest as the host added them. */
export function sortSignupItems<T extends Pick<SignupItem, "slot_date" | "sort_order" | "created_at">>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (a.slot_date ?? "9999-99-99").localeCompare(b.slot_date ?? "9999-99-99") ||
      a.sort_order - b.sort_order ||
      a.created_at.localeCompare(b.created_at),
  );
}

// ── What guests see ──────────────────────────────────────────

/** A row as a guest sees it. Guests see what others are bringing, not who. */
export interface GuestSignupRow {
  id: string;
  label: string;
  slotDate: string | null;
  needed: number;
  taken: number;
  /** This guest's claim on the row, or null. */
  mine: { note: string | null } | null;
  /** What other people said they're bringing. */
  bringing: string[];
  /** A dated row whose day is over. Nobody new can take it. */
  passed: boolean;
}

/**
 * The rows for one guest's page. `guestId` is null for someone without a
 * personal link. `today` is YYYY-MM-DD; a row counts as passed only once its
 * day is before it.
 */
export function signupRowsForGuest(
  data: Pick<SignupSheetWithRows, "items" | "claims">,
  guestId: string | null,
  today: string,
): GuestSignupRow[] {
  return sortSignupItems(data.items).map((item) => {
    const claims = data.claims.filter((c) => c.item_id === item.id);
    const mine = guestId ? claims.find((c) => c.guest_id === guestId) : undefined;
    return {
      id: item.id,
      label: item.label,
      slotDate: item.slot_date,
      needed: item.needed,
      taken: claims.length,
      mine: mine ? { note: mine.note } : null,
      bringing: claims
        .filter((c) => c !== mine && c.note)
        .map((c) => c.note as string),
      passed: Boolean(item.slot_date && item.slot_date < today),
    };
  });
}

/** Whether a guest can take a spot on a row they don't already have. */
export function rowIsOpen(row: Pick<GuestSignupRow, "needed" | "taken" | "mine" | "passed">): boolean {
  return !row.mine && !row.passed && row.taken < row.needed;
}

/** How a row's spots stand: "2 of 3 left", "Full", "1 needed". */
export function spotsLabel(row: Pick<GuestSignupRow, "needed" | "taken">): string {
  const left = Math.max(row.needed - row.taken, 0);
  if (left === 0) return "Full";
  if (row.needed === 1) return "Open";
  return row.taken === 0 ? `${row.needed} needed` : `${left} of ${row.needed} left`;
}

// ── What hosts see ───────────────────────────────────────────

export interface HostSignupRow {
  id: string;
  label: string;
  slotDate: string | null;
  needed: number;
  claims: { guestId: string; name: string; note: string | null }[];
}

export function signupRowsForHost(
  data: Pick<SignupSheetWithRows, "items" | "claims">,
  guests: { id: string; name: string }[],
): HostSignupRow[] {
  const names = new Map(guests.map((g) => [g.id, g.name]));
  return sortSignupItems(data.items).map((item) => ({
    id: item.id,
    label: item.label,
    slotDate: item.slot_date,
    needed: item.needed,
    claims: data.claims
      .filter((c) => c.item_id === item.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({ guestId: c.guest_id, name: names.get(c.guest_id) ?? "A guest", note: c.note })),
  }));
}

/** A guest's claims, as their row on the guest list and their emails show them. */
export interface GuestClaim {
  label: string;
  slotDate: string | null;
  note: string | null;
}

/** Each guest's claims, by guest id, in the sheet's order. */
export function claimsByGuest(data: Pick<SignupSheetWithRows, "items" | "claims">): Map<string, GuestClaim[]> {
  const byGuest = new Map<string, GuestClaim[]>();
  for (const item of sortSignupItems(data.items)) {
    for (const claim of data.claims.filter((c) => c.item_id === item.id)) {
      const list = byGuest.get(claim.guest_id) ?? [];
      list.push({ label: item.label, slotDate: item.slot_date, note: claim.note });
      byGuest.set(claim.guest_id, list);
    }
  }
  return byGuest;
}

/** "Sat, Nov 15" for a YYYY-MM-DD date. */
export function formatSlotDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat, Nov 15: Dinner (Lasagna)" or "Side (Mac and cheese)". */
export function describeClaim(claim: GuestClaim): string {
  const what = claim.slotDate ? `${formatSlotDate(claim.slotDate)}: ${claim.label}` : claim.label;
  return claim.note ? `${what} (${claim.note})` : what;
}

// ── Meal trains ──────────────────────────────────────────────

/**
 * A meal train shows its drop-off address only to guests who signed up for a
 * day, and to its hosts. Everything that shows an event to guests (the page,
 * the emails, the calendar file) asks this first.
 */
export function hidesAddressUntilSignup(eventType: string): boolean {
  return eventType === "meal_train";
}

/**
 * The event with its place blanked when the viewer shouldn't see it yet:
 * a meal train, for someone who hasn't signed up.
 */
export function withAddressFor<T extends { event_type: string; location_name: string | null; location_address: string | null }>(
  event: T,
  signedUp: boolean,
): T {
  if (!hidesAddressUntilSignup(event.event_type) || signedUp) return event;
  return { ...event, location_name: null, location_address: null };
}
