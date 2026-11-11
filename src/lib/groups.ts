// Groups: saved guest lists that last, like "the Chens" or "Book club". See
// supabase/migrations/20261111223600_groups.sql. The tables are server-only;
// reads are in src/lib/groups-server.ts and changes in src/lib/actions/groups.ts.
//
// This file has no imports, so the browser, the server and tests can all use it.

export const MAX_GROUP_NAME_LENGTH = 80;
/** The same as an event's guest list, so a whole group always fits on one. */
export const MAX_GROUP_MEMBERS = 300;
export const MAX_GROUPS_PER_OWNER = 50;

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  created_at: string;
}

/** A group in a list: its name and how many people are in it. */
export interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
}

/** An event whose guests came from a group. */
export interface GroupEvent {
  id: string;
  slug: string;
  title: string;
  event_date: string | null;
  created_at: string;
  hasExchange: boolean;
  drawn: boolean;
}

/** Someone to add to a group or a guest list: a name and an optional email. */
export interface Person {
  name: string;
  email: string | null;
}

/**
 * What makes two people the same person on a list: the email when there is
 * one, otherwise the name. It's how event guest lists skip people already on
 * them, and how a gift exchange recognizes last year's pairs.
 */
export function personKey(person: Person): string {
  return person.email ? `e:${person.email.trim().toLowerCase()}` : `n:${person.name.trim().toLowerCase()}`;
}

/**
 * The people in `incoming` who aren't on `existing` yet, each once, in the
 * order given. Names and emails are trimmed and emails lowercased.
 */
export function newPeople(existing: Person[], incoming: Person[]): Person[] {
  const seen = new Set(existing.map(personKey));
  const out: Person[] = [];
  for (const raw of incoming) {
    const name = raw.name.trim();
    if (!name) continue;
    const person = { name, email: raw.email?.trim().toLowerCase() || null };
    const key = personKey(person);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(person);
  }
  return out;
}

/** A group's name, cleaned up, or an error to show. */
export function readGroupName(value: string | null | undefined): { name: string } | { error: string } {
  const name = (value ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { error: "Give the group a name." };
  if (name.length > MAX_GROUP_NAME_LENGTH) {
    return { error: `Keep the name under ${MAX_GROUP_NAME_LENGTH} characters.` };
  }
  return { name };
}

/** "3 people" or "1 person". */
export function memberCountLabel(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}
