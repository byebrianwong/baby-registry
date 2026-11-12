// Server-only: birthdays of the people someone follows, for the Following page
// and the daily reminder email. Birthdays come from gift profiles (see
// src/lib/gift-profile.ts): a person's own in profiles.gift_profile, and a
// child's in the settings of a list kept for them.
//
// A birthday goes only to followers the person approved, the same people who
// see it on their profile. A child's birthday goes to the approved followers
// of the parent who keeps the list, and only while that list is on the
// parent's profile, since that's where followers see it.
//
// These read `follows` and `profiles` with the service-role client. They take
// raw user ids, so only call them with an id you got from auth, or from the
// cron job. Never export them from a "use server" file.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { displayName, profilePath } from "@/lib/profile-link";
import { sendBirthdayReminder } from "@/lib/email";
import {
  BIRTHDAYS_AHEAD_DAYS,
  BIRTHDAY_REMINDER_DAYS,
  addDays,
  nextAnnualDate,
  parseGiftProfile,
  pickBirthdayList,
  sortBirthdays,
  type BirthdayListCandidate,
  type UpcomingBirthday,
} from "@/lib/gift-profile";

interface Person {
  id: string;
  public_id: string;
  full_name: string | null;
  birthday: unknown;
}

// Only what the birthday code needs from a list's settings. The rest of
// settings holds the shipping address and payment handles, so it isn't read.
const LIST_COLUMNS =
  "id, slug, title, honoree_names, owner_id, registry_type, event_type, event_date, for_child:settings->for_child, child_birthday:settings->gift_profile->birthday";

interface ListedList extends BirthdayListCandidate {
  id: string;
  title: string;
  honoree_names: string | null;
  owner_id: string;
  child_birthday: unknown;
}

/** A birthday, and whose followers hear about it. */
interface BirthdaySubject extends UpcomingBirthday {
  /** Whose approved followers see this birthday. */
  ownerId: string;
}

/**
 * The birthdays of these people, and of the children whose lists they show on
 * their profiles, that fall on or before `until`.
 */
async function birthdaysOf(people: Person[], today: string, until: string): Promise<BirthdaySubject[]> {
  if (people.length === 0) return [];
  const byId = new Map(people.map((p) => [p.id, p]));

  const { data: listed, error } = await supabaseAdmin
    .from("registries")
    .select(LIST_COLUMNS)
    .in("owner_id", [...byId.keys()])
    .eq("listed_on_profile", true);
  if (error) console.error("[birthdays] Failed to read listed lists:", error);
  const lists = (listed ?? []) as unknown as ListedList[];

  const subjects: BirthdaySubject[] = [];
  const inRange = (date: string) => date <= until;

  for (const person of people) {
    const birthday = parseGiftProfile({ birthday: person.birthday }).birthday;
    if (!birthday) continue;
    const date = nextAnnualDate(birthday, today);
    if (!inRange(date)) continue;
    const list = pickBirthdayList(
      lists.filter((l) => l.owner_id === person.id),
      today,
    );
    subjects.push({
      key: `${person.id}:${date}`,
      ownerId: person.id,
      name: displayName(person),
      date,
      href: list ? `/r/${list.slug}` : profilePath(person),
      linkTo: list ? "list" : "profile",
    });
  }

  for (const list of lists) {
    if (list.for_child !== true || list.registry_type !== "personal") continue;
    const birthday = parseGiftProfile({ birthday: list.child_birthday }).birthday;
    const parent = byId.get(list.owner_id);
    if (!birthday || !parent) continue;
    const date = nextAnnualDate(birthday, today);
    if (!inRange(date)) continue;
    subjects.push({
      key: `list:${list.id}:${date}`,
      ownerId: list.owner_id,
      name: list.honoree_names?.trim() || list.title,
      date,
      href: `/r/${list.slug}`,
      linkTo: "list",
      parentName: displayName(parent),
    });
  }

  return sortBirthdays(subjects);
}

/**
 * Birthdays in the next 30 days of the people this account follows, who
 * approved them. For the Following page.
 */
export async function listUpcomingBirthdays(userId: string, today: string): Promise<UpcomingBirthday[]> {
  const { data, error } = await supabaseAdmin
    .from("follows")
    .select("person:profiles!follows_followee_id_fkey(id, public_id, full_name, birthday:gift_profile->birthday)")
    .eq("follower_id", userId)
    .eq("status", "approved");
  // Errors until 20261112062844_gift_profiles_and_birthday_reminders.sql has
  // run, which counts as no birthdays.
  if (error) return [];

  const people = ((data ?? []) as unknown as { person: Person | null }[])
    .map((row) => row.person)
    .filter((p): p is Person => Boolean(p));
  const subjects = await birthdaysOf(people, today, addDays(today, BIRTHDAYS_AHEAD_DAYS));
  // ownerId stays on the server.
  return subjects.map(({ ownerId: _ownerId, ...birthday }) => birthday);
}

// ── The daily reminder ───────────────────────────────────────────────────

const REMINDER_KIND = "birthday";
const KEEP_LOG_DAYS = 60;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Logs a reminder before it's sent. False when it was logged already, so a
 * second run, or a retry, never sends it twice. Also false if the log can't
 * be written, so nothing is sent unlogged.
 */
async function claim(subjectKey: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("reminder_log")
    .insert({ kind: REMINDER_KIND, subject_key: subjectKey, user_id: userId });
  if (error && error.code !== "23505") console.error("[birthdays] Failed to log a reminder:", error);
  return !error;
}

async function unclaim(subjectKeys: string[], userId: string) {
  await supabaseAdmin
    .from("reminder_log")
    .delete()
    .eq("kind", REMINDER_KIND)
    .eq("user_id", userId)
    .in("subject_key", subjectKeys);
}

/**
 * Run once a day by /api/cron/birthdays. Emails each approved follower about
 * the birthdays exactly 10 days away, in one email per follower. Followers who
 * turned birthday emails off on their Account page don't get one.
 */
export async function processBirthdayReminders(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const target = addDays(today, BIRTHDAY_REMINDER_DAYS);
  const month = String(Number(target.slice(5, 7)));

  // Everyone with a birthday in the target's month: a short list, checked
  // exactly below. A February 29 birthday is on February 28 in other years.
  const [{ data: people, error: peopleError }, { data: childLists, error: childError }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, public_id, full_name, birthday:gift_profile->birthday")
      .eq("gift_profile->birthday->>month", month),
    supabaseAdmin
      .from("registries")
      .select("owner_id")
      .eq("listed_on_profile", true)
      .eq("registry_type", "personal")
      .eq("settings->>for_child", "true")
      .eq("settings->gift_profile->birthday->>month", month),
  ]);
  if (peopleError) throw peopleError;
  if (childError) throw childError;

  // Parents of children with a birthday that month, so birthdaysOf finds the
  // children's lists, even when the parent's own birthday is another month.
  const owners = new Map(((people ?? []) as unknown as Person[]).map((p) => [p.id, p]));
  const parentIds = [...new Set((childLists ?? []).map((l) => l.owner_id as string))].filter(
    (id) => !owners.has(id),
  );
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseAdmin
      .from("profiles")
      .select("id, public_id, full_name")
      .in("id", parentIds);
    // Their own birthday isn't this month, so it's left off.
    for (const p of parents ?? []) owners.set(p.id as string, { ...(p as Omit<Person, "birthday">), birthday: null });
  }

  const subjects = (await birthdaysOf([...owners.values()], today, target)).filter((s) => s.date === target);
  if (subjects.length === 0) return { birthdays: 0, sent: 0, failed: 0 };

  const { data: followRows, error: followsError } = await supabaseAdmin
    .from("follows")
    .select("followee_id, follower:profiles!follows_follower_id_fkey(id, full_name, email_birthday_reminders)")
    .in("followee_id", [...new Set(subjects.map((s) => s.ownerId))])
    .eq("status", "approved");
  if (followsError) throw followsError;

  type FollowRow = {
    followee_id: string;
    follower: { id: string; full_name: string | null; email_birthday_reminders: boolean } | null;
  };
  const byFollower = new Map<string, { name: string | null; subjects: BirthdaySubject[] }>();
  for (const row of (followRows ?? []) as unknown as FollowRow[]) {
    if (!row.follower || row.follower.email_birthday_reminders === false) continue;
    const entry = byFollower.get(row.follower.id) ?? { name: row.follower.full_name, subjects: [] };
    entry.subjects.push(...subjects.filter((s) => s.ownerId === row.followee_id));
    byFollower.set(row.follower.id, entry);
  }

  let sent = 0;
  let failed = 0;
  for (const [followerId, { name, subjects: theirs }] of byFollower) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(followerId);
    const email = data?.user?.email;
    if (!email || data.user?.is_anonymous) continue;

    const claimed: BirthdaySubject[] = [];
    for (const subject of theirs) {
      if (await claim(subject.key, followerId)) claimed.push(subject);
    }
    if (claimed.length === 0) continue;

    const ok = await sendBirthdayReminder({
      toEmail: email,
      toName: name?.trim() || null,
      days: BIRTHDAY_REMINDER_DAYS,
      birthdays: sortBirthdays(claimed).map((s) => ({
        name: s.name,
        date: s.date,
        parentName: s.parentName,
        linkUrl: `${siteUrl()}${s.href}`,
        linkTo: s.linkTo,
      })),
      settingsUrl: `${siteUrl()}/dashboard/account#birthday-emails`,
    });
    if (ok) {
      sent++;
    } else {
      failed++;
      // Let a second run today try again.
      await unclaim(
        claimed.map((s) => s.key),
        followerId,
      );
    }
  }

  // Old rows aren't needed: each key has the birthday's date in it.
  const cutoff = new Date(now.getTime() - KEEP_LOG_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("reminder_log").delete().eq("kind", REMINDER_KIND).lt("sent_at", cutoff);

  return { birthdays: subjects.length, sent, failed };
}
