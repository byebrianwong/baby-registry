// Emails a host sends guests after the invitation (#100): a message the host
// writes, the automatic email when the date, time or place changes, and the
// reminder the day before. Each is logged on event_messages. The senders are
// in src/lib/email.ts, the actions in src/lib/actions/event-messages.ts and
// updateEvent, and the daily job in src/lib/event-reminders-server.ts.
//
// This file has no imports, so the browser, the server and tests can all use it.

export type MessageAudience = "going" | "going_maybe" | "not_declined";

export const MESSAGE_AUDIENCES: Record<MessageAudience, { label: string; statuses: string[] }> = {
  going: { label: "Everyone going", statuses: ["yes"] },
  going_maybe: { label: "Going and maybe", statuses: ["yes", "maybe"] },
  not_declined: { label: "Everyone who hasn't said no", statuses: ["yes", "maybe", "pending"] },
};

export function isMessageAudience(value: unknown): value is MessageAudience {
  return typeof value === "string" && value in MESSAGE_AUDIENCES;
}

export const MAX_MESSAGE_SUBJECT_LENGTH = 150;
export const MAX_MESSAGE_BODY_LENGTH = 5000;
/** Most messages a host can write to one event's guests in a day. */
export const MAX_MESSAGES_PER_DAY = 5;

export interface EventMessage {
  id: string;
  event_id: string;
  sent_by: string | null;
  kind: "message" | "change" | "reminder";
  audience: MessageAudience;
  subject: string;
  body: string | null;
  recipients: number;
  created_at: string;
}

/**
 * A message or a change as the invitation shows it, for anyone with the event
 * link (#129). Guests the host texted the link to, and guests whose email
 * bounced, see it there. Day-before reminders stay off the invitation.
 */
export type InvitationUpdate = Pick<EventMessage, "id" | "subject" | "body" | "created_at"> & {
  kind: "message" | "change";
};

/** The messages and changes the invitation shows, newest first as given. */
export function invitationUpdates(
  messages: Pick<EventMessage, "id" | "kind" | "subject" | "body" | "created_at">[],
): InvitationUpdate[] {
  return messages
    .filter(
      // A change's body is the line the invitation shows. Changes logged
      // before #129 have none.
      (m) => (m.kind === "message" || m.kind === "change") && Boolean(m.body?.trim()),
    )
    .map((m) => ({
      id: m.id,
      kind: m.kind as InvitationUpdate["kind"],
      subject: m.subject,
      body: m.body,
      created_at: m.created_at,
    }));
}

/**
 * Whether anyone might have the invitation already: a guest who said yes or
 * maybe, one who was emailed it, or one with no email address, whom the host
 * can only have sent the link. A new date, time or place is posted on the
 * invitation then, even when nobody gets an email about it.
 */
export function someoneHasInvitation<T extends { email: string | null; rsvp_status: string; invited_at: string | null }>(
  guests: T[],
): boolean {
  return guests.some(
    (g) =>
      g.rsvp_status === "yes" ||
      g.rsvp_status === "maybe" ||
      (g.rsvp_status === "pending" && (Boolean(g.invited_at) || !g.email)),
  );
}

/** The guests a message goes to: those with an email whose answer fits the audience. */
export function messageRecipients<T extends { email: string | null; rsvp_status: string }>(
  guests: T[],
  audience: MessageAudience,
): (T & { email: string })[] {
  const statuses = MESSAGE_AUDIENCES[audience].statuses;
  return guests.filter((g): g is T & { email: string } => Boolean(g.email) && statuses.includes(g.rsvp_status));
}

/**
 * Who hears that the date, time or place changed: everyone who said yes or
 * maybe, and everyone invited who hasn't answered yet. Not people who said no,
 * and not people who were never sent the invitation.
 */
export function changeRecipients<T extends { email: string | null; rsvp_status: string; invited_at: string | null }>(
  guests: T[],
): (T & { email: string })[] {
  return guests.filter(
    (g): g is T & { email: string } =>
      Boolean(g.email) &&
      (g.rsvp_status === "yes" || g.rsvp_status === "maybe" || (g.rsvp_status === "pending" && Boolean(g.invited_at))),
  );
}

export type ChangedPart = "date" | "time" | "place";

interface WhenAndWhere {
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  time_zone: string | null;
  location_name: string | null;
  location_address: string | null;
}

function sameTime(a: string | null, b: string | null): boolean {
  return (a?.slice(0, 5) ?? null) === (b?.slice(0, 5) ?? null);
}

function sameText(a: string | null, b: string | null): boolean {
  return (a?.trim() || null) === (b?.trim() || null);
}

/** Which of the date, time and place differ between two versions of an event. */
export function changedParts(before: WhenAndWhere, after: WhenAndWhere): ChangedPart[] {
  const parts: ChangedPart[] = [];
  if (before.event_date !== after.event_date) parts.push("date");
  if (
    !sameTime(before.start_time, after.start_time) ||
    !sameTime(before.end_time, after.end_time) ||
    ((before.start_time || after.start_time) && !sameText(before.time_zone, after.time_zone))
  ) {
    parts.push("time");
  }
  if (!sameText(before.location_name, after.location_name) || !sameText(before.location_address, after.location_address)) {
    parts.push("place");
  }
  return parts;
}

/** "New date", "New time and place", "New date, time and place". */
export function changeSummary(parts: ChangedPart[]): string {
  if (parts.length === 0) return "";
  const words = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `New ${words}`;
}

/**
 * The line the invitation shows for a change: "New time. It's now Sunday,
 * March 14, 2027, 3:30 PM PDT." `when` is the new date and time as the
 * invitation writes them. A new place is never spelled out, since a meal
 * train hides its address until a guest signs up. The details above it show
 * the place to whoever may see it.
 */
export function changeNotice(parts: ChangedPart[], when: string | null): string {
  const summary = changeSummary(parts);
  if (!summary) return "";
  const timing = parts.includes("date") || parts.includes("time");
  return timing && when ? `${summary}. It's now ${when}.` : `${summary}.`;
}

// ── Dates in the event's own time zone ───────────────────────

/** Today's date (YYYY-MM-DD) in a time zone, or in UTC when it has none. */
export function dateIn(timeZone: string | null, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** The day after a YYYY-MM-DD date. */
export function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Whether the event is tomorrow, in its own time zone. */
export function isTomorrowFor(event: { event_date: string | null; time_zone: string | null }, now: Date = new Date()): boolean {
  return Boolean(event.event_date) && event.event_date === nextDate(dateIn(event.time_zone, now));
}
