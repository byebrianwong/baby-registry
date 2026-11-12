// Server-only: the daily job that emails everyone going a reminder the day
// before an event (#100). Vercel Cron calls /api/cron/event-reminders once a
// day (vercel.json). Each event is reminded once per date: events.reminded_for
// holds the date the last reminder was for, so moving the event sends another.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getEventRegistries, getGiftExchange, getSignupSheet } from "@/lib/events-server";
import { sendDayBeforeReminders } from "@/lib/email";
import { isTomorrowFor } from "@/lib/event-updates";
import { claimsByGuest, describeClaim } from "@/lib/signups";
import type { EventDetails, EventGuest } from "@/lib/events";

export interface ReminderJobResult {
  /** Events that got a reminder. */
  events: number;
  /** Emails sent. */
  emails: number;
}

export async function processEventReminders(now: Date = new Date()): Promise<ReminderJobResult> {
  // An event is tomorrow somewhere between yesterday and two days from now in
  // UTC, whatever its time zone. isTomorrowFor settles it in the event's zone.
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("remind_day_before", true)
    .gte("event_date", from)
    .lte("event_date", to);
  const due = ((data || []) as (EventDetails & { reminded_for: string | null })[]).filter(
    (event) => isTomorrowFor(event, now) && event.reminded_for !== event.event_date,
  );

  const result: ReminderJobResult = { events: 0, emails: 0 };
  for (const event of due) {
    // A mailed gift exchange has no get-together to remind anyone about.
    const exchange = await getGiftExchange(event.id);
    if (exchange?.mailed) continue;

    // Claim the reminder first, so two runs can't both send it.
    const { data: claimed } = await supabaseAdmin
      .from("events")
      .update({ reminded_for: event.event_date })
      .eq("id", event.id)
      .or(`reminded_for.is.null,reminded_for.neq.${event.event_date}`)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const { data: guestRows } = await supabaseAdmin
      .from("event_guests")
      .select("id, name, email, token, party_size")
      .eq("event_id", event.id)
      .eq("rsvp_status", "yes")
      .not("email", "is", null);
    const guests = (guestRows || []) as (Pick<EventGuest, "id" | "name" | "token" | "party_size"> & { email: string })[];
    if (guests.length === 0) continue;

    const [registries, sheet, hostName, owner] = await Promise.all([
      getEventRegistries(event.id),
      getSignupSheet(event.id),
      hostNameOf(event),
      supabaseAdmin.auth.admin.getUserById(event.owner_id),
    ]);
    const claims = sheet ? claimsByGuest(sheet) : new Map();
    const sent = await sendDayBeforeReminders({
      event,
      registries,
      hostName,
      replyTo: owner.data.user?.email ?? null,
      guests: guests.map((g) => ({
        name: g.name,
        email: g.email,
        token: g.token,
        signups: (claims.get(g.id) ?? []).map(describeClaim),
      })),
    });
    if (sent > 0) {
      await supabaseAdmin.from("event_messages").insert({
        event_id: event.id,
        sent_by: null,
        kind: "reminder",
        audience: "going",
        subject: `Tomorrow: ${event.title}`.slice(0, 150),
        recipients: sent,
      });
      result.events += 1;
      result.emails += sent;
    }
  }
  return result;
}

async function hostNameOf(event: EventDetails): Promise<string> {
  if (event.hosted_by) return event.hosted_by;
  const { data } = await supabaseAdmin.from("profiles").select("full_name").eq("id", event.owner_id).single();
  return data?.full_name?.trim() || "Your host";
}
