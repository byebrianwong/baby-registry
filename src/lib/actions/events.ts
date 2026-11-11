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
  getEventRegistries,
  getExchangeExclusions,
  getGiftExchange,
  registrySlugFromLink,
  resolveRegistryLink,
} from "@/lib/events-server";
import {
  isEmail,
  isEventType,
  isTimeZone,
  MAX_GIFT_NOTE_LENGTH,
  MAX_GUESTS_PER_EVENT,
  MAX_PARTY_SIZE_LIMIT,
  MIN_EXCHANGE_PARTICIPANTS,
  summarizeRsvps,
  type EventDetails,
  type EventGuest,
  type GiftExchange,
  type ParsedGuest,
  type RsvpStatus,
} from "@/lib/events";
import { drawNames, orderedPair, type Pair } from "@/lib/gift-exchange";
import { settingsAfterJoiningExchange } from "@/lib/gifts";
import { newPeople, personKey, type Person } from "@/lib/groups";
import { getGroupForOwner, getGroupMembers, listGroupEvents } from "@/lib/groups-server";
import { createGroup } from "@/lib/actions/groups";
import { getSessionUser } from "@/lib/viewer";
import { confirmRsvpToGuest, notifyHostOfRsvp, sendEventInvitations } from "@/lib/email";
import { notifyRegistryLinked, sendCoHostInvite, sendExchangeAssignments } from "@/lib/event-email";

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
  "id" | "owner_id" | "registry_id" | "slug" | "image_url" | "repeated_from" | "created_at" | "updated_at"
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
      gift_note: text(formData, "giftNote", MAX_GIFT_NOTE_LENGTH),
      ask_kids: formData.get("askKids") === "true",
    },
  };
}

type ExchangeForm =
  | { enabled: false }
  | { enabled: true; budget: string | null; draw_by: string | null; mailed: boolean };

// The gift exchange settings. Missing fields mean the form didn't include
// them, which leaves the exchange as it is.
function readExchangeForm(formData: FormData): ExchangeForm | null | { error: string } {
  const enabled = formData.get("exchangeEnabled");
  if (enabled === null) return null;
  if (enabled !== "true") return { enabled: false };
  const drawBy = dateField(formData, "exchangeDrawBy");
  if (drawBy === "invalid") return { error: "The draw date doesn't look right." };
  return {
    enabled: true,
    budget: text(formData, "exchangeBudget", 40),
    draw_by: drawBy,
    mailed: formData.get("exchangeMailed") === "true",
  };
}

// ── Linked registries ────────────────────────────────────────

const MAX_LINKED_REGISTRIES = 10;

/**
 * The registries the event form asks to link, in order. Each is either one
 * the host manages (by id), one already linked (by id), or any registry by
 * its share link. Null when the form didn't send a list, which leaves the
 * links as they are.
 */
async function readRegistryLinks(
  formData: FormData,
  userId: string,
  alreadyLinked: Set<string>,
): Promise<{ ids: string[] | null } | { error: string }> {
  const raw = formData.get("registryLinks");
  if (raw === null) return { ids: null };
  let entries: unknown;
  try {
    entries = JSON.parse(String(raw));
  } catch {
    return { error: "The registry list didn't come through. Try again." };
  }
  if (!Array.isArray(entries)) return { error: "The registry list didn't come through. Try again." };

  const ids: string[] = [];
  for (const entry of entries.slice(0, MAX_LINKED_REGISTRIES)) {
    const id = typeof entry?.id === "string" ? entry.id : null;
    const link = typeof entry?.link === "string" ? entry.link : null;
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "One of those registries wasn't found." };
      if (!alreadyLinked.has(id) && !(await canManageRegistry(userId, id))) {
        return { error: "Pick one of your registries, or paste the link to someone else's." };
      }
      if (!ids.includes(id)) ids.push(id);
    } else if (link) {
      const found = await resolveRegistryLink(link);
      if (!found) return { error: `"${link.slice(0, 80)}" isn't a link to a Regibee registry.` };
      if (!ids.includes(found.id)) ids.push(found.id);
    }
  }
  return { ids };
}

/**
 * Makes the event's links match `ids`, in that order. Registries the host
 * manages bring their other managers in as co-hosts, the way a registry's
 * managers could manage its events before co-hosts existed. Owners of
 * registries the host doesn't manage get an email saying their registry was
 * linked.
 */
async function saveRegistryLinks(event: Pick<EventDetails, "id" | "owner_id" | "title" | "slug">, ids: string[], userId: string) {
  const { data: rows } = await supabaseAdmin.from("event_registries").select("registry_id").eq("event_id", event.id);
  const current = new Set((rows || []).map((r) => r.registry_id as string));
  const removed = [...current].filter((id) => !ids.includes(id));
  const added = ids.filter((id) => !current.has(id));

  if (removed.length > 0) {
    await supabaseAdmin.from("event_registries").delete().eq("event_id", event.id).in("registry_id", removed);
  }
  if (added.length > 0) {
    const { error } = await supabaseAdmin.from("event_registries").insert(
      added.map((registryId) => ({
        event_id: event.id,
        registry_id: registryId,
        linked_by: userId,
        sort_order: ids.indexOf(registryId),
      })),
    );
    if (error) {
      console.error("[events] Failed to link registries:", error);
      return { error: "The registries weren't linked. Try again." };
    }
  }
  for (const [index, registryId] of ids.entries()) {
    if (current.has(registryId)) {
      await supabaseAdmin
        .from("event_registries")
        .update({ sort_order: index })
        .eq("event_id", event.id)
        .eq("registry_id", registryId);
    }
  }

  const notifyIds: string[] = [];
  for (const registryId of added) {
    if (await canManageRegistry(userId, registryId)) {
      const { data: managers } = await supabaseAdmin
        .from("registry_managers")
        .select("user_id")
        .eq("registry_id", registryId);
      const coHosts = (managers || [])
        .map((m) => m.user_id as string)
        .filter((id) => id !== event.owner_id);
      if (coHosts.length > 0) {
        await supabaseAdmin
          .from("event_hosts")
          .upsert(coHosts.map((id) => ({ event_id: event.id, user_id: id })), { ignoreDuplicates: true });
      }
    } else {
      notifyIds.push(registryId);
    }
  }
  if (notifyIds.length > 0) {
    after(() => notifyRegistryLinked({ event, registryIds: notifyIds, linkedBy: userId }));
  }

  for (const registryId of [...removed, ...added]) revalidatePath(`/dashboard/registry/${registryId}`);
  return { error: null };
}

async function saveExchange(eventId: string, form: ExchangeForm): Promise<{ error: string | null }> {
  const existing = await getGiftExchange(eventId);
  if (!form.enabled) {
    if (!existing) return { error: null };
    if (existing.drawn_at) {
      return { error: "Names have been drawn. To turn the gift exchange off, undo the draw first." };
    }
    await supabaseAdmin.from("gift_exchanges").delete().eq("event_id", eventId);
    return { error: null };
  }
  const values = { budget: form.budget, draw_by: form.draw_by, mailed: form.mailed };
  const { error } = existing
    ? await supabaseAdmin.from("gift_exchanges").update(values).eq("event_id", eventId)
    : await supabaseAdmin.from("gift_exchanges").insert({ event_id: eventId, ...values });
  if (error) {
    console.error("[events] Failed to save the gift exchange:", error);
    return { error: "The gift exchange settings weren't saved. Try again." };
  }
  return { error: null };
}

/** Finds a registry from a pasted link, so the event form can show its name before saving. */
export async function lookupRegistryLink(
  link: string,
): Promise<Result<{ registry: { id: string; title: string; honoree: string | null } }>> {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." };
  if (!registrySlugFromLink(link)) return { error: "Paste a registry link, like regibee.com/r/remi-and-max-1a2b." };
  const found = await resolveRegistryLink(link);
  if (!found) return { error: "No registry has that link. Check it and try again." };
  return { error: null, registry: { id: found.id, title: found.title, honoree: found.honoree } };
}

/**
 * Removes a registry from an event. The event's hosts can do it, and so can
 * the registry's own managers: a registry shows up on someone else's
 * invitation only as long as its owners are happy with that.
 */
export async function unlinkRegistryFromEvent(eventId: string, registryId: string): Promise<Result> {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." };
  const managesEvent = await getEventForManager(eventId, user.id);
  if (!managesEvent && !(await canManageRegistry(user.id, registryId))) {
    return { error: "You can't change this event's registries." };
  }
  const { data: event } = await supabaseAdmin.from("events").select("id, slug").eq("id", eventId).maybeSingle();
  if (!event) return { error: "That event wasn't found." };
  const { error: deleteError } = await supabaseAdmin
    .from("event_registries")
    .delete()
    .eq("event_id", eventId)
    .eq("registry_id", registryId);
  if (deleteError) return { error: "The registry wasn't unlinked. Try again." };
  // The old column, until it's dropped: keep it from bringing the link back.
  await supabaseAdmin.from("events").update({ registry_id: null }).eq("id", eventId).eq("registry_id", registryId);
  revalidateEvent(event);
  revalidatePath(`/dashboard/registry/${registryId}`);
  revalidatePath("/dashboard/events");
  return { error: null };
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
  const links = await readRegistryLinks(formData, user.id, new Set());
  if ("error" in links) return { error: links.error };
  const exchange = readExchangeForm(formData);
  if (exchange && "error" in exchange) return { error: exchange.error };

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      ...form.fields,
      owner_id: user.id,
      slug: generateEventSlug(form.fields.title),
    })
    .select("id, slug, owner_id, title")
    .single();
  if (error || !data) {
    console.error("[events] Failed to create event:", error);
    return { error: "The event wasn't saved. Try again." };
  }

  // The event is saved from here on. If a link or the exchange fails to
  // save, the event page shows it missing and the host adds it from Edit,
  // which beats a second copy of the event from trying again.
  if (links.ids && links.ids.length > 0) await saveRegistryLinks(data, links.ids, user.id);
  if (exchange?.enabled) await saveExchange(data.id, exchange);

  revalidateEvent(data);
  return { error: null, id: data.id };
}

export async function updateEvent(eventId: string, formData: FormData): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };

  const form = readEventForm(formData);
  if ("error" in form) return { error: form.error };
  const exchange = readExchangeForm(formData);
  if (exchange && "error" in exchange) return { error: exchange.error };

  const linked = new Set((await getEventRegistries(eventId)).map((r) => r.id));
  const links = await readRegistryLinks(formData, access.user.id, linked);
  if ("error" in links) return { error: links.error };

  const changes: Record<string, unknown> = { ...form.fields };
  const imageUrl = formData.get("imageUrl");
  if (typeof imageUrl === "string") {
    if (imageUrl && !imageUrl.startsWith(eventImageUrlPrefix(eventId))) {
      return { error: "That picture wasn't uploaded to this event. Upload it again." };
    }
    changes.image_url = imageUrl || null;
  }

  if (exchange) {
    const saved = await saveExchange(eventId, exchange);
    if (saved.error) return { error: saved.error };
  }

  const { error } = await supabaseAdmin.from("events").update(changes).eq("id", eventId);
  if (error) {
    console.error("[events] Failed to update event:", error);
    return { error: "Your changes weren't saved. Try again." };
  }

  if (links.ids) {
    const saved = await saveRegistryLinks(access.event, links.ids, access.user.id);
    if (saved.error) return { error: saved.error };
  }

  revalidateEvent(access.event);
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

  const registries = await getEventRegistries(eventId);
  const { error } = await supabaseAdmin.from("events").delete().eq("id", eventId);
  if (error) return { error: "The event wasn't deleted. Try again." };

  revalidateEvent(access.event);
  for (const registry of registries) revalidatePath(`/dashboard/registry/${registry.id}`);
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

  const [registries, exchange, hostName] = await Promise.all([
    getEventRegistries(eventId),
    getGiftExchange(eventId),
    hostNameFor(access.event, access.user.id),
  ]);
  const { sentTokens, error } = await sendEventInvitations({
    event: access.event,
    registries,
    exchange,
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

  const [registries, exchange, hostName] = await Promise.all([
    getEventRegistries(eventId),
    getGiftExchange(eventId),
    hostNameFor(access.event, access.user.id),
  ]);
  const { sentTokens, error } = await sendEventInvitations({
    event: access.event,
    registries,
    exchange,
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
  /** Of partySize, how many are kids. Read only when the event asks. */
  kidsCount?: number;
  note?: string;
  /** For an event with a gift exchange. */
  exchange?: {
    join: boolean;
    wishlistUrl?: string;
    giftIdeas?: string;
    shippingAddress?: string;
  };
}

/**
 * A wishlist link as a guest typed it, cleaned up: a Regibee registry link
 * becomes a full link to this site, anything else must be a web address.
 */
function readWishlistUrl(value: string | undefined): { url: string | null } | { error: string } {
  const text = value?.trim() ?? "";
  if (!text) return { url: null };
  if (text.length > 500) return { error: "That wishlist link is too long." };
  const slug = registrySlugFromLink(text);
  if (slug && (text.includes("/r/") || !text.includes("."))) {
    return { url: `${siteUrl()}/r/${slug}` };
  }
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) throw new Error("no host");
    return { url: url.toString() };
  } catch {
    return { error: "That wishlist link doesn't look right. Paste the whole link from your browser." };
  }
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * When a guest adds their own Regibee wishlist to a gift exchange, the list
 * starts hiding what's been reserved from them, so their gifts stay a
 * surprise (settingsAfterJoiningExchange in src/lib/gifts.ts says which lists
 * qualify). It's their own list when the account they're signed in with, or
 * the email on their RSVP, is the list owner's. Anyone else's list is left
 * alone, since a share link can be pasted by anyone.
 */
async function hideReservationsOnOwnWishlist(wishlistUrl: string | null, guestEmail: string | null) {
  if (!wishlistUrl?.startsWith(`${siteUrl()}/r/`)) return;
  const slug = registrySlugFromLink(wishlistUrl);
  if (!slug) return;
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("id, owner_id, registry_type, settings")
    .eq("slug", slug)
    .maybeSingle();
  if (!registry) return;
  const settings = settingsAfterJoiningExchange(registry);
  if (!settings) return;

  const viewer = await getSessionUser();
  let isOwner = viewer?.id === registry.owner_id;
  if (!isOwner && guestEmail) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(registry.owner_id);
    isOwner = data.user?.email?.toLowerCase() === guestEmail.toLowerCase();
  }
  if (!isOwner) return;

  await supabaseAdmin.from("registries").update({ settings }).eq("id", registry.id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/registry/${registry.id}`);
}

/**
 * A guest's RSVP. Needs no account: a guest with a personal link is found by
 * its token, and anyone else can add themselves when the host left open RSVPs
 * on. Returns the guest's token, so the page can show their own link.
 *
 * With a gift exchange, the RSVP also says whether the guest is in it, with
 * their wishlist, gift ideas and (when gifts are mailed) shipping address.
 * Once names are drawn, nobody joins or leaves from here; the host handles
 * that. Guests can still update their wishlist and address.
 */
export async function submitRsvp(input: RsvpInput): Promise<Result<{ token: string }>> {
  if (!["yes", "no", "maybe"].includes(input.status)) return { error: "Choose an answer." };

  const { data: eventRow } = await supabaseAdmin.from("events").select("*").eq("slug", input.slug).maybeSingle();
  if (!eventRow) return { error: "This event wasn't found." };
  const event = eventRow as EventDetails;
  const exchange = await getGiftExchange(event.id);

  // A mailed exchange has no get-together: "yes" means "I'm in", for one person.
  const partySize =
    input.status === "no"
      ? 0
      : exchange?.mailed
        ? 1
        : Math.min(Math.max(Math.round(Number(input.partySize)) || 1, 1), event.max_party_size);
  const kidsCount =
    event.ask_kids && input.status !== "no"
      ? Math.min(Math.max(Math.round(Number(input.kidsCount)) || 0, 0), partySize)
      : 0;
  const note = input.note?.trim().slice(0, 1000) || null;
  const response: Record<string, unknown> = {
    rsvp_status: input.status,
    party_size: partySize,
    kids_count: kidsCount,
    rsvp_note: note,
    responded_at: new Date().toISOString(),
  };

  // The guest as they are now, for the exchange rules below.
  let existing: Pick<EventGuest, "in_exchange"> | null = null;
  if (input.token) {
    const { data } = await supabaseAdmin
      .from("event_guests")
      .select("in_exchange")
      .eq("event_id", event.id)
      .eq("token", input.token)
      .maybeSingle();
    if (!data) return { error: "This RSVP link isn't on the guest list anymore. Ask the host for a new one." };
    existing = data;
  }

  if (exchange && input.exchange) {
    const wantsIn = exchange.mailed ? input.status === "yes" : input.exchange.join && input.status !== "no";
    const inExchange = exchange.drawn_at ? Boolean(existing?.in_exchange) : wantsIn;
    if (!exchange.drawn_at) response.in_exchange = inExchange;
    if (inExchange) {
      const wishlist = readWishlistUrl(input.exchange.wishlistUrl);
      if ("error" in wishlist) return { error: wishlist.error };
      const address = input.exchange.shippingAddress?.trim().slice(0, 300) || null;
      if (exchange.mailed && !address) {
        return { error: "Add a shipping address, so your Secret Santa can mail your gift." };
      }
      response.wishlist_url = wishlist.url;
      response.gift_ideas = input.exchange.giftIdeas?.trim().slice(0, 1000) || null;
      response.shipping_address = exchange.mailed ? address : null;
    }
  }

  let guest: { name: string; email: string | null; token: string; in_exchange: boolean };
  let newGuest = false;

  if (input.token) {
    const { data, error } = await supabaseAdmin
      .from("event_guests")
      .update(response)
      .eq("event_id", event.id)
      .eq("token", input.token)
      .select("name, email, token, in_exchange")
      .maybeSingle();
    if (error || !data) return { error: "This RSVP link isn't on the guest list anymore. Ask the host for a new one." };
    guest = data;
  } else {
    if (!event.open_rsvp) {
      return { error: "This event takes RSVPs from the link in your invitation email." };
    }
    // With no get-together, the exchange is the whole event, and it's closed once names are drawn.
    if (exchange?.drawn_at && exchange.mailed) {
      return { error: "Names for the gift exchange have been drawn, so it's closed to new people. Ask the host." };
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
      .select("name, email, token, in_exchange")
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

  if (guest.in_exchange && typeof response.wishlist_url === "string") {
    await hideReservationsOnOwnWishlist(response.wishlist_url, guest.email).catch((err) =>
      console.error("[events] Failed to hide reservations on a wishlist:", err),
    );
  }

  after(async () => {
    const registries = await getEventRegistries(event.id);
    const tasks: Promise<void>[] = [];
    if (guest.email) {
      tasks.push(
        confirmRsvpToGuest({
          event,
          registries,
          exchange,
          inExchange: guest.in_exchange,
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

// ── Co-hosts ─────────────────────────────────────────────────

function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Emails someone an invitation to co-host. */
export async function inviteCoHost(eventId: string, email: string): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  const address = email.trim().toLowerCase();
  if (!isEmail(address)) return { error: "That email address doesn't look right." };

  const token = generateInviteToken();
  const { error } = await supabaseAdmin
    .from("event_host_invites")
    .insert({ event_id: eventId, invited_by: access.user.id, email: address, token });
  if (error) return { error: "The invitation wasn't saved. Try again." };

  const hostName = await hostNameFor(access.event, access.user.id);
  after(() => sendCoHostInvite({ toEmail: address, inviterName: hostName, eventTitle: access.event.title, token }));
  revalidateEvent(access.event);
  return { error: null };
}

/** A co-host link the host sends themselves. Anyone who opens it before it expires can co-host. */
export async function createCoHostLink(eventId: string): Promise<Result<{ token: string }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  const token = generateInviteToken();
  const { error } = await supabaseAdmin
    .from("event_host_invites")
    .insert({ event_id: eventId, invited_by: access.user.id, email: null, token });
  if (error) return { error: "The link wasn't made. Try again." };
  revalidateEvent(access.event);
  return { error: null, token };
}

export async function revokeCoHostInvite(eventId: string, inviteId: string): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  await supabaseAdmin.from("event_host_invites").delete().eq("id", inviteId).eq("event_id", eventId);
  revalidateEvent(access.event);
  return { error: null };
}

/** The owner removes a co-host, or a co-host leaves. Nobody removes the owner. */
export async function removeCoHost(eventId: string, userId: string): Promise<Result> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  if (userId === access.event.owner_id) return { error: "The person who made the event can't be removed." };
  if (!access.isOwner && userId !== access.user.id) {
    return { error: "Only the person who made the event can remove other co-hosts." };
  }
  const { error } = await supabaseAdmin.from("event_hosts").delete().eq("event_id", eventId).eq("user_id", userId);
  if (error) return { error: "That didn't work. Try again." };
  revalidateEvent(access.event);
  if (userId === access.user.id) redirect("/dashboard/events");
  return { error: null };
}

/** Accepts a co-host invitation for the signed-in person. */
export async function acceptCoHostInvite(token: string): Promise<Result<{ eventId: string }>> {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." };

  const { data: invite } = await supabaseAdmin
    .from("event_host_invites")
    .select("id, event_id, email, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!invite || Date.parse(invite.expires_at) < Date.now()) {
    return { error: "This invitation has expired or was taken back. Ask the host for a new one." };
  }
  const { data: event } = await supabaseAdmin.from("events").select("id, slug, owner_id").eq("id", invite.event_id).maybeSingle();
  if (!event) return { error: "That event doesn't exist anymore." };

  if (event.owner_id !== user.id) {
    const { error: insertError } = await supabaseAdmin
      .from("event_hosts")
      .upsert({ event_id: event.id, user_id: user.id }, { ignoreDuplicates: true });
    if (insertError) return { error: "That didn't work. Try again." };
  }
  // An emailed invitation is for one person. A shared link keeps working until it expires.
  if (invite.email) await supabaseAdmin.from("event_host_invites").delete().eq("id", invite.id);

  revalidateEvent(event);
  return { error: null, eventId: event.id };
}

// ── Reusing guests and events ────────────────────────────────

/** Adds the guests of another event the user hosts, skipping anyone already on the list. */
export async function copyGuestsFromEvent(
  eventId: string,
  sourceEventId: string,
): Promise<Result<{ added: number; alreadyListed: number }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  if (!(await getEventForManager(sourceEventId, access.user.id))) {
    return { error: "You can only copy guests from an event you host." };
  }
  const source = await getEventGuests(sourceEventId);
  const existing = await getEventGuests(eventId);
  const emails = new Set(existing.map((g) => g.email?.toLowerCase()).filter(Boolean));
  const names = new Set(existing.filter((g) => !g.email).map((g) => g.name.toLowerCase()));

  const toAdd = source.filter((g) =>
    g.email ? !emails.has(g.email.toLowerCase()) : !names.has(g.name.toLowerCase()),
  );
  if (existing.length + toAdd.length > MAX_GUESTS_PER_EVENT) {
    return { error: `An event can have up to ${MAX_GUESTS_PER_EVENT} guests.` };
  }
  if (toAdd.length > 0) {
    const { error } = await supabaseAdmin.from("event_guests").insert(
      toAdd.map((g) => ({ event_id: eventId, name: g.name, email: g.email, token: generateGuestToken() })),
    );
    if (error) return { error: "The guests weren't added. Try again." };
  }
  revalidateEvent(access.event);
  return { error: null, added: toAdd.length, alreadyListed: source.length - toAdd.length };
}

function nextYear(date: string | null): string | null {
  if (!date) return null;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * A copy of an event a year later, owned by `ownerId`, with the same co-hosts,
 * registries and gift exchange settings. Its guests are `guests` (their
 * answers cleared), the old event's guests unless given. A gift exchange
 * keeps its exclusions between people who are still invited, and avoids this
 * time's pairs when it draws next time (repeated_from).
 */
async function copyEventForNextYear(
  old: EventDetails,
  ownerId: string,
  opts: { guests?: Person[]; groupId?: string | null } = {},
): Promise<Result<{ id: string }>> {
  const { data: copy, error } = await supabaseAdmin
    .from("events")
    .insert({
      owner_id: ownerId,
      slug: generateEventSlug(old.title),
      event_type: old.event_type,
      title: old.title,
      hosted_by: old.hosted_by,
      event_date: nextYear(old.event_date),
      start_time: old.start_time,
      end_time: old.end_time,
      time_zone: old.time_zone,
      location_name: old.location_name,
      location_address: old.location_address,
      message: old.message,
      image_url: old.image_url,
      rsvp_by: nextYear(old.rsvp_by),
      max_party_size: old.max_party_size,
      open_rsvp: old.open_rsvp,
      email_host_on_rsvp: old.email_host_on_rsvp,
      gift_note: old.gift_note,
      ask_kids: old.ask_kids,
      repeated_from: old.id,
      group_id: opts.groupId === undefined ? (old.group_id ?? null) : opts.groupId,
    })
    .select("id, slug")
    .single();
  if (error || !copy) {
    console.error("[events] Failed to copy event:", error);
    return { error: "The new event wasn't made. Try again." };
  }

  const [oldGuests, registries, exchange, exclusions, hostRows] = await Promise.all([
    getEventGuests(old.id),
    getEventRegistries(old.id),
    getGiftExchange(old.id),
    getExchangeExclusions(old.id),
    supabaseAdmin.from("event_hosts").select("user_id").eq("event_id", old.id),
  ]);

  // The new guest ids for the old guests, to carry exclusions over. Copied
  // guests match by position. A new list matches by email, or by name.
  const people = opts.guests ? newPeople([], opts.guests) : oldGuests.map((g) => ({ name: g.name, email: g.email }));
  const newIds = new Map<string, string>();
  if (people.length > 0) {
    const { data: inserted } = await supabaseAdmin
      .from("event_guests")
      .insert(people.map((g) => ({ event_id: copy.id, name: g.name, email: g.email, token: generateGuestToken() })))
      .select("id, name, email");
    const rows = (inserted || []) as { id: string; name: string; email: string | null }[];
    if (opts.guests) {
      const byKey = new Map(rows.map((row) => [personKey(row), row.id]));
      for (const guest of oldGuests) {
        const id = byKey.get(personKey(guest));
        if (id) newIds.set(guest.id, id);
      }
    } else {
      // Rows come back in insert order.
      rows.forEach((row, index) => newIds.set(oldGuests[index].id, row.id));
    }
  }
  const newIdFor = (oldId: string) => newIds.get(oldId);

  // Co-hosts carry over. Whoever made the copy owns it; if that was a
  // co-host, the old owner becomes a co-host of the new one.
  const hostIds = new Set((hostRows.data || []).map((h) => h.user_id as string));
  hostIds.add(old.owner_id);
  hostIds.delete(ownerId);
  if (hostIds.size > 0) {
    await supabaseAdmin.from("event_hosts").insert([...hostIds].map((id) => ({ event_id: copy.id, user_id: id })));
  }

  if (registries.length > 0) {
    await supabaseAdmin.from("event_registries").insert(
      registries.map((r, index) => ({ event_id: copy.id, registry_id: r.id, linked_by: ownerId, sort_order: index })),
    );
  }

  if (exchange) {
    await supabaseAdmin.from("gift_exchanges").insert({
      event_id: copy.id,
      budget: exchange.budget,
      draw_by: nextYear(exchange.draw_by),
      mailed: exchange.mailed,
    });
    const pairs = exclusions
      .map((x) => [newIdFor(x.guest_a), newIdFor(x.guest_b)] as const)
      .filter((pair): pair is readonly [string, string] => Boolean(pair[0] && pair[1]))
      .map(([a, b]) => orderedPair(a, b));
    if (pairs.length > 0) {
      await supabaseAdmin
        .from("exchange_exclusions")
        .insert(pairs.map(([a, b]) => ({ event_id: copy.id, guest_a: a, guest_b: b })));
    }
  }

  revalidatePath("/dashboard/events");
  return { error: null, id: copy.id };
}

/**
 * "Plan it again": a copy of the event a year later, with the same guests
 * (their answers cleared), co-hosts, registries and gift exchange settings.
 * A gift exchange avoids this time's pairs when it draws next time.
 */
export async function planEventAgain(eventId: string): Promise<Result<{ id: string }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  return copyEventForNextYear(access.event, access.user.id);
}

// ── Groups ───────────────────────────────────────────────────

/**
 * "Save as a group": a new group with this event's guests in it. The event
 * remembers the group, so the group's page lists it.
 */
export async function saveGuestListAsGroup(eventId: string, name: string): Promise<Result<{ groupId: string }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  const guests = await getEventGuests(eventId);
  if (guests.length === 0) return { error: "Add guests first." };
  const created = await createGroup(
    name,
    guests.map((g) => ({ name: g.name, email: g.email })),
  );
  if (created.error !== null) return { error: created.error };
  if (!access.event.group_id) {
    await supabaseAdmin.from("events").update({ group_id: created.id }).eq("id", eventId);
  }
  revalidateEvent(access.event);
  return { error: null, groupId: created.id };
}

/** "Invite a group": adds a group's people to the guest list, skipping anyone already on it. */
export async function inviteGroupToEvent(
  eventId: string,
  groupId: string,
): Promise<Result<{ added: number; alreadyListed: number }>> {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error };
  const group = await getGroupForOwner(groupId, access.user.id);
  if (!group) return { error: "You can only invite your own groups." };

  const [members, existing] = await Promise.all([getGroupMembers(groupId), getEventGuests(eventId)]);
  const toAdd = newPeople(existing, members);
  if (existing.length + toAdd.length > MAX_GUESTS_PER_EVENT) {
    return { error: `An event can have up to ${MAX_GUESTS_PER_EVENT} guests.` };
  }
  if (toAdd.length > 0) {
    const { error } = await supabaseAdmin.from("event_guests").insert(
      toAdd.map((g) => ({ event_id: eventId, name: g.name, email: g.email, token: generateGuestToken() })),
    );
    if (error) return { error: "The guests weren't added. Try again." };
  }
  if (!access.event.group_id) {
    await supabaseAdmin.from("events").update({ group_id: groupId }).eq("id", eventId);
  }
  revalidateEvent(access.event);
  revalidatePath(`/dashboard/groups/${groupId}`);
  return { error: null, added: toAdd.length, alreadyListed: members.length - toAdd.length };
}

/**
 * Starts this year's gift exchange inside a group: an event with the group's
 * people as guests and a gift exchange turned on. When the group had an
 * exchange before, this copies the newest one a year later, so it keeps its
 * budget, exclusions and co-hosts and avoids last year's pairs. The guests
 * are whoever is in the group now. Returns the new event's id.
 */
export async function startGroupExchange(groupId: string): Promise<Result<{ id: string }>> {
  const { user, error: authError } = await requireAccount();
  if (authError || !user) return { error: authError ?? "You need an account to do this." };
  const group = await getGroupForOwner(groupId, user.id);
  if (!group) return { error: "That group wasn't found." };
  const members = await getGroupMembers(groupId);
  if (members.length === 0) return { error: "Add people to the group first." };

  const last = (await listGroupEvents(groupId)).find((e) => e.hasExchange);
  if (last) {
    const { data: old } = await supabaseAdmin.from("events").select("*").eq("id", last.id).single();
    if (old) {
      const copied = await copyEventForNextYear(old as EventDetails, user.id, { guests: members, groupId });
      if (copied.error === null) revalidatePath(`/dashboard/groups/${groupId}`);
      return copied;
    }
  }

  const title = `${group.name} gift exchange`.slice(0, 120);
  const { data: event, error } = await supabaseAdmin
    .from("events")
    .insert({
      owner_id: user.id,
      slug: generateEventSlug(title),
      event_type: "gift_exchange",
      title,
      group_id: groupId,
      // The group is the guest list, so only invited people can RSVP.
      open_rsvp: false,
    })
    .select("id")
    .single();
  if (error || !event) {
    console.error("[events] Failed to start a group exchange:", error);
    return { error: "The gift exchange wasn't made. Try again." };
  }
  await supabaseAdmin.from("gift_exchanges").insert({ event_id: event.id });
  await supabaseAdmin.from("event_guests").insert(
    newPeople([], members).map((m) => ({ event_id: event.id, name: m.name, email: m.email, token: generateGuestToken() })),
  );
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/groups/${groupId}`);
  return { error: null, id: event.id };
}

// ── Gift exchange ────────────────────────────────────────────

async function requireExchange(eventId: string) {
  const access = await requireEventManager(eventId);
  if (access.error !== null) return { error: access.error } as const;
  const exchange = await getGiftExchange(eventId);
  if (!exchange) return { error: "This event doesn't have a gift exchange. Turn it on from Edit." } as const;
  return { ...access, exchange } as const;
}

/** The host puts a guest in the exchange or takes them out, before names are drawn. */
export async function setExchangeParticipant(eventId: string, guestId: string, inExchange: boolean): Promise<Result> {
  const access = await requireExchange(eventId);
  if (access.error !== null) return { error: access.error };
  if (access.exchange.drawn_at) {
    return { error: "Names have been drawn. Undo the draw to change who's in." };
  }
  const { error } = await supabaseAdmin
    .from("event_guests")
    .update({ in_exchange: inExchange })
    .eq("id", guestId)
    .eq("event_id", eventId);
  if (error) return { error: "That didn't save. Try again." };
  revalidateEvent(access.event);
  return { error: null };
}

/** Two guests who won't draw each other, such as partners. */
export async function addExchangeExclusion(eventId: string, guestA: string, guestB: string): Promise<Result> {
  const access = await requireExchange(eventId);
  if (access.error !== null) return { error: access.error };
  if (guestA === guestB) return { error: "Pick two different people." };
  const guests = await getEventGuests(eventId);
  if (!guests.some((g) => g.id === guestA) || !guests.some((g) => g.id === guestB)) {
    return { error: "Those people aren't both on the guest list." };
  }
  const [a, b] = orderedPair(guestA, guestB);
  const { error } = await supabaseAdmin
    .from("exchange_exclusions")
    .upsert({ event_id: eventId, guest_a: a, guest_b: b }, { ignoreDuplicates: true });
  if (error) return { error: "That didn't save. Try again." };
  revalidateEvent(access.event);
  return { error: null };
}

export async function removeExchangeExclusion(eventId: string, guestA: string, guestB: string): Promise<Result> {
  const access = await requireExchange(eventId);
  if (access.error !== null) return { error: access.error };
  const [a, b] = orderedPair(guestA, guestB);
  await supabaseAdmin.from("exchange_exclusions").delete().eq("event_id", eventId).eq("guest_a", a).eq("guest_b", b);
  revalidateEvent(access.event);
  return { error: null };
}

/**
 * Last time's pairs, from the event this one was copied from, matched to
 * this event's guests by email address, or by name for guests without one.
 */
async function previousPairs(event: EventDetails, participants: EventGuest[]): Promise<Pair[]> {
  if (!event.repeated_from) return [];
  const before = await getEventGuests(event.repeated_from);
  const keyOf = (g: Pick<EventGuest, "email" | "name">) => (g.email ? `e:${g.email.toLowerCase()}` : `n:${g.name.toLowerCase()}`);
  const now = new Map(participants.map((g) => [keyOf(g), g.id]));
  const byId = new Map(before.map((g) => [g.id, g]));
  const pairs: Pair[] = [];
  for (const giver of before) {
    const receiver = giver.giftee_id ? byId.get(giver.giftee_id) : null;
    if (!receiver) continue;
    const giverNow = now.get(keyOf(giver));
    const receiverNow = now.get(keyOf(receiver));
    if (giverNow && receiverNow) pairs.push([giverNow, receiverNow]);
  }
  return pairs;
}

async function clearDraw(eventId: string) {
  await supabaseAdmin.from("event_guests").update({ giftee_id: null }).eq("event_id", eventId).not("giftee_id", "is", null);
  await supabaseAdmin.from("gift_exchanges").update({ drawn_at: null }).eq("event_id", eventId);
}

/**
 * Draws names and emails each person who they're giving to. The host never
 * sees who drew whom: each person sees only their own on their RSVP link.
 * With `again`, it clears the last draw first, for when people joined or
 * left afterwards.
 */
export async function drawExchangeNames(
  eventId: string,
  { again = false }: { again?: boolean } = {},
): Promise<Result<{ emailed: number; withoutEmail: number }>> {
  const access = await requireExchange(eventId);
  if (access.error !== null) return { error: access.error };
  if (access.exchange.drawn_at && !again) return { error: "Names have already been drawn." };

  const guests = await getEventGuests(eventId);
  const participants = guests.filter((g) => g.in_exchange);
  if (participants.length < MIN_EXCHANGE_PARTICIPANTS) {
    return { error: `A gift exchange needs at least ${MIN_EXCHANGE_PARTICIPANTS} people. ${participants.length} have joined so far.` };
  }
  const ids = new Set(participants.map((g) => g.id));
  const exclusions = (await getExchangeExclusions(eventId))
    .filter((x) => ids.has(x.guest_a) && ids.has(x.guest_b))
    .map((x) => [x.guest_a, x.guest_b] as Pair);
  const result = drawNames({
    people: participants.map((g) => g.id),
    exclusions,
    previous: await previousPairs(access.event, participants),
  });
  if (!result.ok) {
    return {
      error:
        result.reason === "too_few"
          ? `A gift exchange needs at least ${MIN_EXCHANGE_PARTICIPANTS} people.`
          : "There's no way to draw names with these exclusions: someone has nobody left to give to. Remove an exclusion and try again.",
    };
  }

  // Claim the draw against the drawn_at this request read, so two hosts
  // pressing the button at once can't both draw, or clear each other's draw
  // after its emails went out.
  const claim = supabaseAdmin
    .from("gift_exchanges")
    .update({ drawn_at: new Date().toISOString() })
    .eq("event_id", eventId);
  const { data: claimed } = await (access.exchange.drawn_at
    ? claim.eq("drawn_at", access.exchange.drawn_at)
    : claim.is("drawn_at", null)
  ).select("event_id");
  if (!claimed || claimed.length === 0) return { error: "Names were just drawn. Refresh the page." };

  // Each person is drawn once (a unique index), so the old pairs go first.
  await supabaseAdmin.from("event_guests").update({ giftee_id: null }).eq("event_id", eventId).not("giftee_id", "is", null);
  for (const [giverId, receiverId] of result.matches) {
    const { error } = await supabaseAdmin
      .from("event_guests")
      .update({ giftee_id: receiverId })
      .eq("id", giverId)
      .eq("event_id", eventId);
    if (error) {
      console.error("[events] Failed to save a draw:", error);
      await clearDraw(eventId);
      return { error: "The draw wasn't saved. Try again." };
    }
  }

  const byId = new Map(participants.map((g) => [g.id, g]));
  const recipients = participants
    .filter((g): g is EventGuest & { email: string } => Boolean(g.email))
    .map((giver) => ({ giver, giftee: byId.get(result.matches.get(giver.id)!)! }));
  const exchange = { ...access.exchange, drawn_at: new Date().toISOString() } as GiftExchange;
  const hostName = await hostNameFor(access.event, access.user.id);
  after(() =>
    sendExchangeAssignments({
      event: access.event,
      exchange,
      hostName,
      replyTo: access.user.email ?? null,
      redraw: again,
      pairs: recipients,
    }),
  );

  revalidateEvent(access.event);
  return { error: null, emailed: recipients.length, withoutEmail: participants.length - recipients.length };
}

/** Clears the draw, so the host can change who's in and draw again. */
export async function undoExchangeDraw(eventId: string): Promise<Result> {
  const access = await requireExchange(eventId);
  if (access.error !== null) return { error: access.error };
  await clearDraw(eventId);
  revalidateEvent(access.event);
  return { error: null };
}
