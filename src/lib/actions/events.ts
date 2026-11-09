"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAccount } from "@/lib/require-account";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { eventImageUrlPrefix } from "@/lib/event-images";
import {
  canManageRegistry,
  getEventForManager,
  getEventGuests,
  getLinkedRegistry,
} from "@/lib/events-server";
import {
  isEmail,
  isEventType,
  isTimeZone,
  MAX_GUESTS_PER_EVENT,
  MAX_PARTY_SIZE_LIMIT,
  summarizeRsvps,
  type EventDetails,
  type ParsedGuest,
  type RsvpStatus,
} from "@/lib/events";
import { confirmRsvpToGuest, notifyHostOfRsvp, sendEventInvitations } from "@/lib/email";

type Result<T = object> = ({ error: null } & T) | { error: string };

// ── Access ───────────────────────────────────────────────────

async function requireEventManager(eventId: string) {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." } as const;
  const found = await getEventForManager(eventId, user.id);
  if (!found) return { error: "That event wasn't found, or you can't manage it." } as const;
  return { error: null, user, ...found } as const;
}

function revalidateEvent(event: Pick<EventDetails, "id" | "slug">) {
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${event.id}`);
  revalidatePath(`/e/${event.slug}`);
}

// ── Reading the event form ───────────────────────────────────

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(formData: FormData, name: string, max: number): string | null {
  const value = (formData.get(name) as string | null)?.trim() ?? "";
  return value ? value.slice(0, max) : null;
}

function dateField(formData: FormData, name: string): string | null | "invalid" {
  const value = (formData.get(name) as string | null)?.trim() ?? "";
  if (!value) return null;
  if (!DATE_PATTERN.test(value) || Number(value.slice(0, 4)) < 1000) return "invalid";
  return value;
}

function timeField(formData: FormData, name: string): string | null | "invalid" {
  const value = (formData.get(name) as string | null)?.trim() ?? "";
  if (!value) return null;
  const short = value.slice(0, 5);
  return TIME_PATTERN.test(short) ? short : "invalid";
}

type EventFields = Omit<
  EventDetails,
  "id" | "owner_id" | "registry_id" | "slug" | "image_url" | "created_at" | "updated_at"
>;

function readEventForm(formData: FormData): { fields: EventFields } | { error: string } {
  const title = text(formData, "title", 120);
  if (!title) return { error: "Give your event a name." };

  const rawType = formData.get("eventType");
  const eventDate = dateField(formData, "eventDate");
  const rsvpBy = dateField(formData, "rsvpBy");
  const startTime = timeField(formData, "startTime");
  const endTime = timeField(formData, "endTime");
  if (eventDate === "invalid") return { error: "That date doesn't look right." };
  if (rsvpBy === "invalid") return { error: "The RSVP date doesn't look right." };
  if (startTime === "invalid" || endTime === "invalid") return { error: "That time doesn't look right." };
  if (endTime && !startTime) return { error: "Add a start time, or clear the end time." };

  const rawZone = (formData.get("timeZone") as string | null)?.trim() ?? "";
  const timeZone = rawZone && isTimeZone(rawZone) ? rawZone : null;

  const rawPartySize = Number(formData.get("maxPartySize") ?? 2);
  const maxPartySize = Number.isInteger(rawPartySize)
    ? Math.min(Math.max(rawPartySize, 1), MAX_PARTY_SIZE_LIMIT)
    : 2;

  return {
    fields: {
      event_type: isEventType(rawType) ? rawType : "other",
      title,
      hosted_by: text(formData, "hostedBy", 120),
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      time_zone: timeZone,
      location_name: text(formData, "locationName", 120),
      location_address: text(formData, "locationAddress", 300),
      message: text(formData, "message", 2000),
      rsvp_by: rsvpBy,
      max_party_size: maxPartySize,
      open_rsvp: formData.get("openRsvp") !== "false",
      email_host_on_rsvp: formData.get("emailHostOnRsvp") !== "false",
    },
  };
}

// Link to a registry only if the user can manage it. An empty value unlinks.
async function readRegistryLink(
  formData: FormData,
  userId: string,
): Promise<{ registryId: string | null } | { error: string }> {
  const value = (formData.get("registryId") as string | null)?.trim() ?? "";
  if (!value) return { registryId: null };
  if (!/^[0-9a-f-]{36}$/i.test(value) || !(await canManageRegistry(userId, value))) {
    return { error: "You can only link a registry you manage." };
  }
  return { registryId: value };
}

// Event links are shared like registry links, but an event page can show a
// home address, so the random part is longer than a registry slug's.
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function generateEventSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
  const random = [...crypto.randomBytes(8)].map((b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
  return base ? `${base}-${random}` : random;
}

function generateGuestToken(): string {
  return crypto.randomBytes(18).toString("base64url");
}

// ── Events ───────────────────────────────────────────────────

/** Creates an event and returns its id. The browser uploads the picture next, if there is one. */
export async function createEvent(formData: FormData): Promise<Result<{ id: string }>> {
  const { user, error: authError } = await requireAccount();
  if (authError || !user) return { error: authError ?? "You need an account to do this." };

  const form = readEventForm(formData);
  if ("error" in form) return { error: form.error };
  const link = await readRegistryLink(formData, user.id);
  if ("error" in link) return { error: link.error };

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      ...form.fields,
      owner_id: user.id,
      registry_id: link.registryId,
      slug: generateEventSlug(form.fields.title),
    })
    .select("id, slug")
    .single();
  if (error || !data) {
    console.error("[events] Failed to create event:", error);
    return { error: "The event wasn't saved. Try again." };
  }

  revalidateEvent(data);
  if (link.registryId) revalidatePath(`/dashboard/registry/${link.registryId}`);
  return { error: null, id: data.id };
}

export async function updateEvent(eventId: string, formData: FormData): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };

  const form = readEventForm(formData);
  if ("error" in form) return { error: form.error };

  // Only the owner changes the registry link. A registry's managers can
  // manage its events, so changing the link changes who can.
  const changes: Record<string, unknown> = { ...form.fields };
  if (access.isOwner) {
    const link = await readRegistryLink(formData, access.user.id);
    if ("error" in link) return { error: link.error };
    changes.registry_id = link.registryId;
  }

  const imageUrl = formData.get("imageUrl");
  if (typeof imageUrl === "string") {
    if (imageUrl && !imageUrl.startsWith(eventImageUrlPrefix(eventId))) {
      return { error: "That picture wasn't uploaded to this event. Upload it again." };
    }
    changes.image_url = imageUrl || null;
  }

  const { error } = await supabaseAdmin.from("events").update(changes).eq("id", eventId);
  if (error) {
    console.error("[events] Failed to update event:", error);
    return { error: "Your changes weren't saved. Try again." };
  }

  revalidateEvent(access.event);
  for (const registryId of new Set([access.event.registry_id, changes.registry_id as string | null | undefined])) {
    if (registryId) revalidatePath(`/dashboard/registry/${registryId}`);
  }
  return { error: null };
}

/** Sets or clears the invitation picture. The browser uploads it first. */
export async function setEventImage(eventId: string, imageUrl: string | null): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  if (imageUrl !== null && !imageUrl.startsWith(eventImageUrlPrefix(eventId))) {
    return { error: "That picture wasn't uploaded to this event. Upload it again." };
  }
  const { error } = await supabaseAdmin.from("events").update({ image_url: imageUrl }).eq("id", eventId);
  if (error) return { error: "The picture wasn't saved. Try again." };
  revalidateEvent(access.event);
  return { error: null };
}

export async function deleteEvent(eventId: string): Promise<{ error: string } | never> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  if (!access.isOwner) return { error: "Only the person who made this event can delete it." };

  const { error } = await supabaseAdmin.from("events").delete().eq("id", eventId);
  if (error) return { error: "The event wasn't deleted. Try again." };

  revalidateEvent(access.event);
  if (access.event.registry_id) revalidatePath(`/dashboard/registry/${access.event.registry_id}`);
  redirect("/dashboard/events");
}

// ── Guests ───────────────────────────────────────────────────

export async function addEventGuests(
  eventId: string,
  guests: ParsedGuest[],
): Promise<Result<{ added: number; alreadyListed: number }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };

  const cleaned: ParsedGuest[] = [];
  for (const guest of guests.slice(0, MAX_GUESTS_PER_EVENT)) {
    const name = typeof guest.name === "string" ? guest.name.trim().slice(0, 100) : "";
    const email = typeof guest.email === "string" && guest.email.trim() ? guest.email.trim().toLowerCase() : null;
    if (!name) continue;
    if (email && !isEmail(email)) return { error: `"${email}" isn't an email address.` };
    cleaned.push({ name, email });
  }
  if (cleaned.length === 0) return { error: "Add a name for each guest." };

  const existing = await getEventGuests(eventId);
  const knownEmails = new Set(existing.map((g) => g.email?.toLowerCase()).filter(Boolean));
  const toAdd: ParsedGuest[] = [];
  let alreadyListed = 0;
  for (const guest of cleaned) {
    if (guest.email && knownEmails.has(guest.email)) {
      alreadyListed += 1;
      continue;
    }
    if (guest.email) knownEmails.add(guest.email);
    toAdd.push(guest);
  }

  if (existing.length + toAdd.length > MAX_GUESTS_PER_EVENT) {
    return { error: `An event can have up to ${MAX_GUESTS_PER_EVENT} guests.` };
  }

  if (toAdd.length > 0) {
    const { error } = await supabaseAdmin.from("event_guests").insert(
      toAdd.map((guest) => ({
        event_id: eventId,
        name: guest.name,
        email: guest.email,
        token: generateGuestToken(),
      })),
    );
    if (error) {
      console.error("[events] Failed to add guests:", error);
      return { error: "The guests weren't added. Try again." };
    }
  }

  revalidateEvent(access.event);
  return { error: null, added: toAdd.length, alreadyListed };
}

export async function updateEventGuest(
  eventId: string,
  guestId: string,
  changes: { name: string; email: string | null },
): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };

  const name = changes.name.trim().slice(0, 100);
  const email = changes.email?.trim().toLowerCase() || null;
  if (!name) return { error: "Add a name." };
  if (email && !isEmail(email)) return { error: "That email address doesn't look right." };

  const { error } = await supabaseAdmin
    .from("event_guests")
    .update({ name, email })
    .eq("id", guestId)
    .eq("event_id", eventId);
  if (error) {
    return {
      error: error.code === "23505" ? "Another guest already has that email address." : "The guest wasn't saved. Try again.",
    };
  }
  revalidateEvent(access.event);
  return { error: null };
}

/** For a host who heard back by phone or in person. Sends no email. */
export async function setGuestRsvp(
  eventId: string,
  guestId: string,
  status: RsvpStatus,
  partySize: number,
): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  if (!["pending", "yes", "no", "maybe"].includes(status)) return { error: "Choose an answer." };

  const size =
    status === "no" ? 0 : Math.min(Math.max(Math.round(partySize) || 1, 1), MAX_PARTY_SIZE_LIMIT);
  const { error } = await supabaseAdmin
    .from("event_guests")
    .update({
      rsvp_status: status,
      party_size: status === "pending" ? 1 : size,
      responded_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", guestId)
    .eq("event_id", eventId);
  if (error) return { error: "The RSVP wasn't saved. Try again." };
  revalidateEvent(access.event);
  return { error: null };
}

export async function removeEventGuest(eventId: string, guestId: string): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  const { error } = await supabaseAdmin.from("event_guests").delete().eq("id", guestId).eq("event_id", eventId);
  if (error) return { error: "The guest wasn't removed. Try again." };
  revalidateEvent(access.event);
  return { error: null };
}

// ── Sending ──────────────────────────────────────────────────

const REMINDER_GAP_MS = 24 * 60 * 60 * 1000;

async function hostNameFor(event: EventDetails, userId: string): Promise<string> {
  if (event.hosted_by) return event.hosted_by;
  const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).single();
  return profile?.full_name?.trim() || "Your host";
}

/**
 * Emails invitations. With guest ids, to those guests (sending again to any
 * already invited). Without, to every guest with an email address who hasn't
 * been invited or replied yet. People who RSVPed from the event link have
 * replied, so they're left out.
 */
export async function sendEventInvites(eventId: string, guestIds?: string[]): Promise<Result<{ sent: number }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };

  const guests = await getEventGuests(eventId);
  const chosen = guestIds ? new Set(guestIds) : null;
  const recipients = guests.filter(
    (g) => g.email && (chosen ? chosen.has(g.id) : !g.invited_at && g.rsvp_status === "pending"),
  ) as (typeof guests[number] & { email: string })[];
  if (recipients.length === 0) return { error: "There's no one to send it to. Add guests with email addresses." };

  const [registry, hostName] = await Promise.all([
    getLinkedRegistry(access.event.registry_id),
    hostNameFor(access.event, access.user.id),
  ]);
  const { sentTokens, error } = await sendEventInvitations({
    event: access.event,
    registry,
    hostName,
    replyTo: access.user.email ?? null,
    guests: recipients,
  });

  if (sentTokens.length > 0) {
    await supabaseAdmin
      .from("event_guests")
      .update({ invited_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .in("token", sentTokens);
    revalidateEvent(access.event);
  }
  if (error) return { error };
  return { error: null, sent: sentTokens.length };
}

/** Emails a reminder to invited guests who haven't replied, at most once a day each. */
export async function sendEventReminders(eventId: string): Promise<Result<{ sent: number }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };

  const now = Date.now();
  const guests = await getEventGuests(eventId);
  const recipients = guests.filter(
    (g) =>
      g.email &&
      g.invited_at &&
      g.rsvp_status === "pending" &&
      (!g.reminded_at || now - Date.parse(g.reminded_at) >= REMINDER_GAP_MS),
  ) as (typeof guests[number] & { email: string })[];
  if (recipients.length === 0) {
    return { error: "Everyone invited has replied or got a reminder in the last day." };
  }

  const [registry, hostName] = await Promise.all([
    getLinkedRegistry(access.event.registry_id),
    hostNameFor(access.event, access.user.id),
  ]);
  const { sentTokens, error } = await sendEventInvitations({
    event: access.event,
    registry,
    hostName,
    replyTo: access.user.email ?? null,
    guests: recipients,
    reminder: true,
  });

  if (sentTokens.length > 0) {
    await supabaseAdmin
      .from("event_guests")
      .update({ reminded_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .in("token", sentTokens);
    revalidateEvent(access.event);
  }
  if (error) return { error };
  return { error: null, sent: sentTokens.length };
}

// ── RSVPs from guests ────────────────────────────────────────

export interface RsvpInput {
  slug: string;
  /** The guest's personal token, from their invitation link. */
  token?: string | null;
  /** Name and email, for someone RSVPing from the event link without a token. */
  name?: string;
  email?: string;
  status: "yes" | "no" | "maybe";
  partySize: number;
  note?: string;
}

/**
 * A guest's RSVP. Needs no account: a guest with a personal link is found by
 * its token, and anyone else can add themselves when the host left open RSVPs
 * on. Returns the guest's token, so the page can show their own link.
 */
export async function submitRsvp(input: RsvpInput): Promise<Result<{ token: string }>> {
  if (!["yes", "no", "maybe"].includes(input.status)) return { error: "Choose an answer." };

  const { data: eventRow } = await supabaseAdmin.from("events").select("*").eq("slug", input.slug).maybeSingle();
  if (!eventRow) return { error: "This event wasn't found." };
  const event = eventRow as EventDetails;

  const partySize =
    input.status === "no"
      ? 0
      : Math.min(Math.max(Math.round(Number(input.partySize)) || 1, 1), event.max_party_size);
  const note = input.note?.trim().slice(0, 1000) || null;
  const response = {
    rsvp_status: input.status,
    party_size: partySize,
    rsvp_note: note,
    responded_at: new Date().toISOString(),
  };

  let guest: { name: string; email: string | null; token: string };
  let newGuest = false;

  if (input.token) {
    const { data, error } = await supabaseAdmin
      .from("event_guests")
      .update(response)
      .eq("event_id", event.id)
      .eq("token", input.token)
      .select("name, email, token")
      .maybeSingle();
    if (error || !data) return { error: "This RSVP link isn't on the guest list anymore. Ask the host for a new one." };
    guest = data;
  } else {
    if (!event.open_rsvp) {
      return { error: "This event takes RSVPs from the link in your invitation email." };
    }
    const name = input.name?.trim().slice(0, 100) ?? "";
    const email = input.email?.trim().toLowerCase() ?? "";
    if (!name) return { error: "Add your name." };
    if (!isEmail(email)) return { error: "Add your email address, so the host can reach you." };

    const { count } = await supabaseAdmin
      .from("event_guests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);
    if ((count ?? 0) >= MAX_GUESTS_PER_EVENT) {
      return { error: "This guest list is full. Get in touch with the host." };
    }

    const { data, error } = await supabaseAdmin
      .from("event_guests")
      .insert({ ...response, event_id: event.id, name, email, token: generateGuestToken(), added_by_guest: true })
      .select("name, email, token")
      .single();
    if (error?.code === "23505") {
      return {
        error:
          "That email is already on the guest list. Open the link in your invitation email to RSVP, or ask the host to send it again.",
      };
    }
    if (error || !data) return { error: "Your RSVP wasn't saved. Try again." };
    guest = data;
    newGuest = true;
  }

  after(async () => {
    const registry = await getLinkedRegistry(event.registry_id);
    const tasks: Promise<void>[] = [];
    if (guest.email) {
      tasks.push(
        confirmRsvpToGuest({
          event,
          registry,
          guest: { name: guest.name, email: guest.email, token: guest.token },
          status: input.status,
          partySize,
        }),
      );
    }
    if (event.email_host_on_rsvp) {
      const summary = summarizeRsvps(await getEventGuests(event.id));
      tasks.push(
        notifyHostOfRsvp({
          event,
          guestName: guest.name,
          status: input.status,
          partySize,
          note,
          attending: summary.attending,
          pending: summary.pending,
          newGuest,
        }),
      );
    }
    await Promise.all(tasks);
  });

  revalidateEvent(event);
  return { error: null, token: guest.token };
}
