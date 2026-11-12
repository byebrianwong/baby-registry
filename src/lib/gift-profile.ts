// A person's gift profile: their birthday, sizes, favorite colors, likes,
// things to skip and notes, so the people who give them gifts can pick well.
// Stored in profiles.gift_profile, or in registries.settings.gift_profile for
// a list kept for a child (see 20261112062844_gift_profiles_and_birthday_reminders.sql).
// Every field is optional.
//
// Who sees what: sizes, likes and the rest show on the owner's personal wish
// lists and their profile page, so anyone with a link sees them. The birthday
// shows only to the owner and to followers they approved.
//
// No imports, so tests can run this file with Node directly.

export interface MonthDay {
  month: number;
  day: number;
}

export interface GiftProfileSizes {
  tops?: string;
  bottoms?: string;
  shoes?: string;
  other?: string;
}

export interface GiftProfile {
  /** Month and day, with no year. */
  birthday?: MonthDay | null;
  sizes?: GiftProfileSizes;
  colors?: string;
  likes?: string[];
  /** "Please skip": things they have or don't want. */
  skip?: string[];
  notes?: string;
}

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MAX_TEXT_LENGTH = 300;
export const MAX_SIZE_LENGTH = 40;

export const SIZE_KEYS: (keyof GiftProfileSizes)[] = ["tops", "bottoms", "shoes", "other"];

export const SIZE_LABELS: Record<keyof GiftProfileSizes, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  shoes: "Shoes",
  other: "Other sizes",
};

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, max).trim();
  return trimmed || undefined;
}

/** Notes keep their line breaks, but not runs of blank lines. */
function cleanNotes(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
    .trim();
  return trimmed || undefined;
}

/** Tags from a list or a comma-separated string, without blanks or repeats. */
export function cleanTags(value: unknown): string[] | undefined {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of raw) {
    const tag = cleanText(entry, MAX_TAG_LENGTH);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags.length ? tags : undefined;
}

/** Days in a month, counting February 29, since birthdays have no year. */
export function daysInMonth(month: number): number {
  // 2024 was a leap year.
  return new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

function cleanBirthday(value: unknown): MonthDay | null {
  if (!value || typeof value !== "object") return null;
  const { month, day } = value as { month?: unknown; day?: unknown };
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1) return null;
  if (d > daysInMonth(m)) return null;
  return { month: m, day: d };
}

/** Reads a stored or submitted profile, dropping anything malformed. */
export function parseGiftProfile(raw: unknown): GiftProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const profile: GiftProfile = {};

  const birthday = cleanBirthday(input.birthday);
  if (birthday) profile.birthday = birthday;

  const rawSizes = (input.sizes && typeof input.sizes === "object" ? input.sizes : {}) as Record<string, unknown>;
  const sizes: GiftProfileSizes = {};
  for (const key of SIZE_KEYS) {
    const size = cleanText(rawSizes[key], MAX_SIZE_LENGTH);
    if (size) sizes[key] = size;
  }
  if (Object.keys(sizes).length) profile.sizes = sizes;

  const colors = cleanText(input.colors, MAX_TEXT_LENGTH);
  if (colors) profile.colors = colors;
  const likes = cleanTags(input.likes);
  if (likes) profile.likes = likes;
  const skip = cleanTags(input.skip);
  if (skip) profile.skip = skip;
  const notes = cleanNotes(input.notes);
  if (notes) profile.notes = notes;

  return profile;
}

/** Whether there's anything to show a giver besides the birthday. */
export function hasGiftDetails(profile: GiftProfile): boolean {
  return Boolean(
    (profile.sizes && Object.keys(profile.sizes).length) ||
      profile.colors ||
      profile.likes?.length ||
      profile.skip?.length ||
      profile.notes,
  );
}

/** The profile without its birthday, for anyone who isn't an approved follower. */
export function withoutBirthday(profile: GiftProfile): GiftProfile {
  const rest = { ...profile };
  delete rest.birthday;
  return rest;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: i + 1, label }));

/** "March 3". */
export function formatBirthday(birthday: MonthDay): string {
  return `${MONTHS[birthday.month - 1]} ${birthday.day}`;
}

/** The sizes as "Tops: M", "Shoes: 9", in a fixed order. */
export function sizeSummary(sizes: GiftProfileSizes | undefined): string[] {
  if (!sizes) return [];
  return SIZE_KEYS.filter((key) => sizes[key]).map((key) => `${SIZE_LABELS[key]}: ${sizes[key]}`);
}

// ── Dates ────────────────────────────────────────────────────────────────
// Dates are YYYY-MM-DD strings, like registries.event_date. "Today" is the
// date in UTC, the same as the rest of the app.

const DAY_MS = 24 * 60 * 60 * 1000;

/** A YYYY-MM-DD date plus some days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * The next date on or after `today` that falls on this month and day. A
 * February 29 birthday falls on February 28 in other years.
 */
export function nextAnnualDate(md: MonthDay, today: string): string {
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const lastDay = new Date(Date.UTC(y, md.month, 0)).getUTCDate();
    const day = Math.min(md.day, lastDay);
    const date = `${y}-${String(md.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (date >= today) return date;
  }
  return addDays(today, 365);
}

/** How many days ahead the Following page lists birthdays. */
export const BIRTHDAYS_AHEAD_DAYS = 30;

/** How many days before a birthday the reminder email goes out. */
export const BIRTHDAY_REMINDER_DAYS = 10;

/** "Today", "Tomorrow" or "In 12 days". */
export function birthdayCountdown(date: string, today: string): string {
  const days = daysBetween(today, date);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** "Tuesday, March 3", for a YYYY-MM-DD date. */
export function formatBirthdayDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Birthdays coming up ──────────────────────────────────────────────────

/** A birthday on the Following page, or in a reminder email. */
export interface UpcomingBirthday {
  /** Unique in the list. */
  key: string;
  /** "Glinda Upland", or a child's name. */
  name: string;
  /** The next birthday, YYYY-MM-DD. */
  date: string;
  /** A path on the site: their wish list, or their profile. */
  href: string;
  /** What the link opens. */
  linkTo: "list" | "profile";
  /** For a child's list: the name of the parent who keeps it. */
  parentName?: string;
}

/** The parts of a listed registry that pickBirthdayList looks at. */
export interface BirthdayListCandidate {
  slug: string;
  registry_type: string | null;
  event_type: string | null;
  event_date: string | null;
  for_child?: boolean | null;
}

/**
 * The wish list a birthday links to: the person's only current personal list
 * on their profile, or their only birthday list among several. Otherwise null,
 * and the link goes to their profile, which lists them all.
 */
export function pickBirthdayList<T extends BirthdayListCandidate>(lists: T[], today: string): T | null {
  const current = lists.filter(
    (list) =>
      list.registry_type === "personal" && !list.for_child && (list.event_date === null || list.event_date >= today),
  );
  if (current.length === 1) return current[0];
  const birthdayLists = current.filter((list) => list.event_type === "birthday");
  return birthdayLists.length === 1 ? birthdayLists[0] : null;
}

/** Soonest first, then by name. */
export function sortBirthdays<T extends { date: string; name: string }>(birthdays: T[]): T[] {
  return [...birthdays].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
