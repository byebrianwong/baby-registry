import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadItemsForLists } from "@/lib/list-items";
import {
  exchangeKind,
  type EventDetails,
  type EventGuest,
  type ExchangeGiftee,
  type GiftExchange,
  type GuestWishList,
  type LinkedRegistry,
} from "@/lib/events";
import type { SignupClaim, SignupItem, SignupSheet, SignupSheetWithRows } from "@/lib/signups";
import type { EventMessage } from "@/lib/event-updates";

// Reads for the event pages. The event tables have no access rules for the
// API roles (see 015_events.sql), so everything goes through the service-role
// client. Every read here is filtered by an id or slug the caller has already
// checked, or by the signed-in user's own id.

/** Registries the user owns or helps manage, for the event form's registry list. */
export async function getManageableRegistries(userId: string): Promise<{ id: string; title: string }[]> {
  const { data: managed } = await supabaseAdmin
    .from("registry_managers")
    .select("registry_id")
    .eq("user_id", userId);
  const ids = (managed || []).map((m) => m.registry_id as string);

  const query = supabaseAdmin.from("registries").select("id, title").order("created_at", { ascending: false });
  const { data } = ids.length > 0
    ? await query.or(`owner_id.eq.${userId},id.in.(${ids.join(",")})`)
    : await query.eq("owner_id", userId);
  return (data || []) as { id: string; title: string }[];
}

/** Whether the user owns the registry or is one of its managers. */
export async function canManageRegistry(userId: string, registryId: string): Promise<boolean> {
  const [{ data: manager }, { data: registry }] = await Promise.all([
    supabaseAdmin
      .from("registry_managers")
      .select("id")
      .eq("registry_id", registryId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin.from("registries").select("owner_id").eq("id", registryId).maybeSingle(),
  ]);
  return Boolean(manager) || registry?.owner_id === userId;
}

/** Whether the user is a co-host of the event. The owner isn't on the list. */
async function isCoHost(eventId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("event_hosts")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * The event, if the user can manage it: its owner or a co-host. Null
 * otherwise, and for events that don't exist. Managing a registry the event
 * links to doesn't count: linking a list shows it to guests and gives nobody
 * rights over anything.
 */
export async function getEventForManager(
  eventId: string,
  userId: string,
): Promise<{ event: EventDetails; isOwner: boolean } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const { data: event } = await supabaseAdmin.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) return null;
  if (event.owner_id === userId) return { event: event as EventDetails, isOwner: true };
  if (await isCoHost(eventId, userId)) return { event: event as EventDetails, isOwner: false };
  return null;
}

export async function getEventGuests(eventId: string): Promise<EventGuest[]> {
  const { data } = await supabaseAdmin
    .from("event_guests")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");
  return (data || []) as EventGuest[];
}

export type EventListEntry = EventDetails & {
  event_guests: { rsvp_status: EventGuest["rsvp_status"]; party_size: number; invited_at: string | null }[];
};

/** Events the user owns or co-hosts. */
export async function listEventsForUser(userId: string): Promise<EventListEntry[]> {
  const { data: hosted } = await supabaseAdmin.from("event_hosts").select("event_id").eq("user_id", userId);
  const ids = (hosted || []).map((h) => h.event_id as string);

  // The guests are the ones whose event_id is this event. The link is named
  // because exchange_exclusions also joins events and event_guests (twice,
  // by guest_a and guest_b), and without the name Supabase refuses the query
  // as ambiguous (PGRST201) and the Events tab comes back empty.
  const query = supabaseAdmin
    .from("events")
    .select("*, event_guests!event_guests_event_id_fkey(rsvp_status, party_size, invited_at)")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const { data, error } = ids.length > 0
    ? await query.or(`owner_id.eq.${userId},id.in.(${ids.join(",")})`)
    : await query.eq("owner_id", userId);
  if (error) console.error("[events] Failed to list events:", error);
  return (data || []) as EventListEntry[];
}

/** Ids of the registries the user owns or helps manage. */
async function managedRegistryIds(userId: string): Promise<string[]> {
  const [{ data: managed }, { data: owned }] = await Promise.all([
    supabaseAdmin.from("registry_managers").select("registry_id").eq("user_id", userId),
    supabaseAdmin.from("registries").select("id").eq("owner_id", userId),
  ]);
  return [...new Set([...(managed || []).map((m) => m.registry_id as string), ...(owned || []).map((r) => r.id as string)])];
}

export type LinkedEventEntry = Pick<EventDetails, "id" | "slug" | "title" | "event_date" | "event_type"> & {
  /** Which of the user's registries it links. */
  registryTitles: string[];
};

/**
 * Events someone else hosts that link one of the user's registries, such as
 * a baby shower a friend is throwing. The user can't manage them, but should
 * know about them, and can unlink their registry.
 */
export async function listLinkedEventsForUser(userId: string): Promise<LinkedEventEntry[]> {
  const registryIds = await managedRegistryIds(userId);
  if (registryIds.length === 0) return [];

  const { data: links } = await supabaseAdmin
    .from("event_registries")
    .select("event_id, registries(title), events(id, slug, title, event_date, event_type, owner_id)")
    .in("registry_id", registryIds);
  if (!links || links.length === 0) return [];

  const { data: hosted } = await supabaseAdmin.from("event_hosts").select("event_id").eq("user_id", userId);
  const hostedIds = new Set((hosted || []).map((h) => h.event_id as string));

  const byEvent = new Map<string, LinkedEventEntry>();
  for (const link of links as unknown as {
    event_id: string;
    registries: { title: string } | null;
    events: (Pick<EventDetails, "id" | "slug" | "title" | "event_date" | "event_type"> & { owner_id: string }) | null;
  }[]) {
    const event = link.events;
    if (!event || event.owner_id === userId || hostedIds.has(event.id)) continue;
    const entry = byEvent.get(event.id) ?? {
      id: event.id,
      slug: event.slug,
      title: event.title,
      event_date: event.event_date,
      event_type: event.event_type,
      registryTitles: [],
    };
    if (link.registries?.title) entry.registryTitles.push(link.registries.title);
    byEvent.set(event.id, entry);
  }
  return [...byEvent.values()].sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"));
}

export type RegistryEventEntry = Pick<EventDetails, "id" | "slug" | "title" | "event_date" | "event_type"> & {
  /** Whether the viewer hosts it. Hosts open the event's dashboard; others see the guest page. */
  canManage: boolean;
};

/** Events linked to one registry, for the registry's dashboard page. */
export async function listEventsForRegistry(registryId: string, viewerId: string): Promise<RegistryEventEntry[]> {
  const { data } = await supabaseAdmin
    .from("event_registries")
    .select("events(id, slug, title, event_date, event_type, owner_id)")
    .eq("registry_id", registryId);
  const events = ((data || []) as unknown as {
    events: (Pick<EventDetails, "id" | "slug" | "title" | "event_date" | "event_type"> & { owner_id: string }) | null;
  }[])
    .map((row) => row.events)
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  if (events.length === 0) return [];

  const { data: hosted } = await supabaseAdmin
    .from("event_hosts")
    .select("event_id")
    .eq("user_id", viewerId)
    .in("event_id", events.map((e) => e.id));
  const hostedIds = new Set((hosted || []).map((h) => h.event_id as string));

  return events
    .map(({ owner_id, ...event }) => ({ ...event, canManage: owner_id === viewerId || hostedIds.has(event.id) }))
    .sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"));
}

// ── Linked registries ────────────────────────────────────────

/** A registry item as the invitation previews it. */
export interface InvitationItem {
  id: string;
  title: string;
  image_url: string | null;
  price: number | null;
}

/** A registry linked to an event, with what the invitation shows of it. */
export interface EventRegistry extends LinkedRegistry {
  id: string;
  /** Whose list it is, as the owner wrote it: "Remi & Max". */
  honoree: string | null;
  photo_url: string | null;
  linked_by: string | null;
  /** A few gifts that are still needed, for the preview. */
  items: InvitationItem[];
  /** How many items still need a giver. */
  itemsLeft: number;
}

const PREVIEW_ITEMS = 4;

/**
 * The registries an event links, in the order they were linked. With
 * withItems, also a few gifts still needed from each, for the invitation.
 */
export async function getEventRegistries(eventId: string, { withItems = false } = {}): Promise<EventRegistry[]> {
  const { data } = await supabaseAdmin
    .from("event_registries")
    .select("linked_by, sort_order, created_at, registries(id, title, slug, honoree_names, parent_names, photo_url)")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("created_at");
  const rows = ((data || []) as unknown as {
    linked_by: string | null;
    registries: {
      id: string;
      title: string;
      slug: string;
      honoree_names: string | null;
      parent_names: string | null;
      photo_url: string | null;
    } | null;
  }[]).filter((row) => row.registries);

  const registries: EventRegistry[] = rows.map((row) => ({
    id: row.registries!.id,
    title: row.registries!.title,
    slug: row.registries!.slug,
    honoree: row.registries!.honoree_names?.trim() || row.registries!.parent_names?.trim() || null,
    photo_url: row.registries!.photo_url,
    linked_by: row.linked_by,
    items: [],
    itemsLeft: 0,
  }));
  if (!withItems || registries.length === 0) return registries;

  // Each list's own items and the ones its owner placed on it from their
  // other lists (src/lib/list-items.ts).
  type PreviewItem = {
    id: string;
    registry_id: string;
    category_id: string | null;
    created_at: string;
    title: string;
    image_url: string | null;
    price: number | null;
    quantity_needed: number;
    quantity_fulfilled: number;
    is_essential: boolean;
    sort_order: number;
  };
  const itemsByList = await loadItemsForLists<PreviewItem>(
    registries.map((r) => r.id),
    "id, registry_id, category_id, created_at, title, image_url, price, quantity_needed, quantity_fulfilled, is_essential, sort_order",
  ).catch(() => new Map<string, PreviewItem[]>());
  for (const registry of registries) {
    const open = (itemsByList.get(registry.id) ?? [])
      .filter((item) => item.quantity_fulfilled < item.quantity_needed)
      // Most wanted first, then in list order.
      .sort((a, b) => Number(b.is_essential) - Number(a.is_essential));
    registry.itemsLeft = open.length;
    // Items with a picture first: the preview is a row of pictures.
    registry.items = [...open]
      .sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
      .slice(0, PREVIEW_ITEMS)
      .map((item) => ({ id: item.id, title: item.title, image_url: item.image_url, price: item.price }));
  }
  return registries;
}

/**
 * Finds a registry from its share link (https://regibee.com/r/<slug>), a
 * path (/r/<slug>), or the slug alone. Anyone with the link can see a
 * registry, so anyone with the link can link it to an event.
 */
export async function resolveRegistryLink(
  input: string,
): Promise<{ id: string; slug: string; title: string; honoree: string | null } | null> {
  const slug = registrySlugFromLink(input);
  if (!slug) return null;
  const { data } = await supabaseAdmin
    .from("registries")
    .select("id, slug, title, honoree_names, parent_names")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    honoree: data.honoree_names?.trim() || data.parent_names?.trim() || null,
  };
}

/** The slug in a registry link, or null when the text isn't one. */
export function registrySlugFromLink(input: string): string | null {
  const text = input.trim();
  if (!text || text.length > 500) return null;
  const fromPath = text.match(/(?:^|\/)r\/([a-z0-9][a-z0-9-]{0,120})(?:[/?#]|$)/i);
  if (fromPath) return fromPath[1].toLowerCase();
  if (/^[a-z0-9][a-z0-9-]{2,120}$/i.test(text)) return text.toLowerCase();
  return null;
}

// ── Co-hosts ─────────────────────────────────────────────────

export interface EventHost {
  userId: string;
  name: string;
  isOwner: boolean;
}

/** The owner and co-hosts, owner first. */
export async function getEventHosts(event: Pick<EventDetails, "id" | "owner_id">): Promise<EventHost[]> {
  const { data: rows } = await supabaseAdmin.from("event_hosts").select("user_id, created_at").eq("event_id", event.id).order("created_at");
  const ids = [event.owner_id, ...(rows || []).map((r) => r.user_id as string)];
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids);
  const names = new Map((profiles || []).map((p) => [p.id as string, (p.full_name as string | null)?.trim() || "Someone"]));
  return ids.map((id) => ({ userId: id, name: names.get(id) ?? "Someone", isOwner: id === event.owner_id }));
}

export interface HostInvite {
  id: string;
  email: string | null;
  token: string;
  expires_at: string;
}

/** Co-host invitations that haven't expired. */
export async function getHostInvites(eventId: string): Promise<HostInvite[]> {
  const { data } = await supabaseAdmin
    .from("event_host_invites")
    .select("id, email, token, expires_at")
    .eq("event_id", eventId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at");
  return (data || []) as HostInvite[];
}

// ── Gift exchanges ───────────────────────────────────────────

export async function getGiftExchange(eventId: string): Promise<GiftExchange | null> {
  const { data } = await supabaseAdmin.from("gift_exchanges").select("*").eq("event_id", eventId).maybeSingle();
  return (data as GiftExchange | null) ?? null;
}

export async function getExchangeExclusions(eventId: string): Promise<{ guest_a: string; guest_b: string }[]> {
  const { data } = await supabaseAdmin.from("exchange_exclusions").select("guest_a, guest_b").eq("event_id", eventId);
  return (data || []) as { guest_a: string; guest_b: string }[];
}

/** What a guest sees about the person they drew, or null before the draw. */
export async function getGifteeFor(eventId: string, gifteeId: string | null): Promise<ExchangeGiftee | null> {
  if (!gifteeId) return null;
  const { data: giftee } = await supabaseAdmin
    .from("event_guests")
    .select("name, wishlist_url, gift_ideas, shipping_address")
    .eq("event_id", eventId)
    .eq("id", gifteeId)
    .maybeSingle();
  if (!giftee) return null;
  const wishlist = giftee.wishlist_url ? await resolveRegistryLink(giftee.wishlist_url) : null;
  return {
    name: giftee.name,
    wishlistUrl: giftee.wishlist_url,
    wishlistTitle: wishlist?.title ?? null,
    giftIdeas: giftee.gift_ideas,
    shippingAddress: giftee.shipping_address,
  };
}

// ── Sign-up sheets ───────────────────────────────────────────

/** The event's sign-up sheet with its rows and claims, or null when it has none. */
export async function getSignupSheet(eventId: string): Promise<SignupSheetWithRows | null> {
  const { data: sheet } = await supabaseAdmin.from("signup_sheets").select("*").eq("event_id", eventId).maybeSingle();
  if (!sheet) return null;
  const { data: items } = await supabaseAdmin
    .from("signup_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("created_at");
  const ids = (items || []).map((i) => i.id as string);
  const { data: claims } = ids.length
    ? await supabaseAdmin.from("signup_claims").select("*").in("item_id", ids).order("created_at")
    : { data: [] };
  return {
    sheet: sheet as SignupSheet,
    items: (items || []) as SignupItem[],
    claims: (claims || []) as SignupClaim[],
  };
}

// ── Messages to guests ───────────────────────────────────────

/** What was emailed to the event's guests after the invitation, newest first. */
export async function getEventMessages(eventId: string, limit = 20): Promise<EventMessage[]> {
  const { data } = await supabaseAdmin
    .from("event_messages")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as EventMessage[];
}

/** Other events the user can manage, newest first, for "copy guests from". */
export async function listOtherEventsForCopy(
  userId: string,
  exceptEventId: string,
): Promise<{ id: string; title: string; guestCount: number }[]> {
  const events = await listEventsForUser(userId);
  return events
    .filter((e) => e.id !== exceptEventId && e.event_guests.length > 0)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => ({ id: e.id, title: e.title, guestCount: e.event_guests.length }));
}

/** People the host asked to make a gift list, who haven't yet (see startPlan). */
export async function getPendingListRequests(eventId: string): Promise<{ name: string; email: string }[]> {
  const { data } = await supabaseAdmin
    .from("event_list_requests")
    .select("name, email")
    .eq("event_id", eventId)
    .is("fulfilled_at", null)
    .order("created_at");
  return (data || []) as { name: string; email: string }[];
}

// ── Everyone gives everyone ──────────────────────────────────

/**
 * Whether guests of this event can shop this registry as part of the event:
 * the event links it, or it's the wish list of one of its guests and the
 * event's gift exchange is everyone gives everyone. (A Secret Santa's
 * wishlist is only for the person who drew them; the gift link route checks
 * that on its own.) With several registries, any one of them counts: an item
 * can be on several lists.
 */
export async function eventIncludesRegistry(eventId: string, registryIds: string | string[]): Promise<boolean> {
  const ids = Array.isArray(registryIds) ? registryIds : [registryIds];
  if (ids.length === 0) return false;
  const [{ data: links }, exchange, { data: wishlists }] = await Promise.all([
    supabaseAdmin.from("event_registries").select("registry_id").eq("event_id", eventId).in("registry_id", ids).limit(1),
    getGiftExchange(eventId),
    supabaseAdmin
      .from("event_guests")
      .select("id")
      .eq("event_id", eventId)
      .in("wishlist_registry_id", ids)
      .eq("in_exchange", true)
      .limit(1),
  ]);
  if ((links?.length ?? 0) > 0) return true;
  return exchangeKind(exchange) === "everyone" && (wishlists?.length ?? 0) > 0;
}

/**
 * Everyone's wish lists for an everyone-gives-everyone event: each guest
 * taking part, with their list or null when they haven't added one. The
 * viewer's own entry comes first. Only the event's guests and hosts get this.
 */
export async function getGuestWishLists(eventId: string, viewerGuestId: string | null): Promise<GuestWishList[]> {
  const { data } = await supabaseAdmin
    .from("event_guests")
    .select("id, name, wishlist_url, wishlist_registry_id, gift_ideas")
    .eq("event_id", eventId)
    .eq("in_exchange", true)
    .order("name");
  const guests = (data || []) as Pick<EventGuest, "id" | "name" | "wishlist_url" | "wishlist_registry_id" | "gift_ideas">[];
  const registryIds = [...new Set(guests.map((g) => g.wishlist_registry_id).filter((id): id is string => Boolean(id)))];
  const { data: registries } = registryIds.length
    ? await supabaseAdmin.from("registries").select("id, title, slug").in("id", registryIds)
    : { data: [] as { id: string; title: string; slug: string }[] };
  const byId = new Map((registries || []).map((r) => [r.id as string, { title: r.title as string, slug: r.slug as string }]));

  return guests
    .map((g) => ({
      guestId: g.id,
      name: g.name,
      isYou: g.id === viewerGuestId,
      url: g.wishlist_url,
      registry: g.wishlist_registry_id ? (byId.get(g.wishlist_registry_id) ?? null) : null,
      giftIdeas: g.gift_ideas,
    }))
    .sort((a, b) => Number(b.isYou) - Number(a.isYou));
}

// ── Reveals ──────────────────────────────────────────────────

/**
 * The events a registry is linked to, by the event's own links or as a
 * guest's wish list. A list that hides reservations from its owner reveals
 * them the day after each one (src/lib/reveal.ts).
 */
export async function getEventsForReveal(
  registryId: string,
): Promise<Pick<EventDetails, "id" | "slug" | "title" | "event_date">[]> {
  const [{ data: links }, { data: wishlists }] = await Promise.all([
    supabaseAdmin.from("event_registries").select("event_id").eq("registry_id", registryId),
    supabaseAdmin.from("event_guests").select("event_id").eq("wishlist_registry_id", registryId),
  ]);
  const ids = [...new Set([...(links || []), ...(wishlists || [])].map((row) => row.event_id as string))];
  if (ids.length === 0) return [];
  const { data } = await supabaseAdmin.from("events").select("id, slug, title, event_date").in("id", ids);
  return (data || []) as Pick<EventDetails, "id" | "slug" | "title" | "event_date">[];
}

/**
 * The moment up to which a list's hidden gifts are revealed to its owner, or
 * null. The database works it out (gifts_revealed_through), the same as for
 * the owner's own reads. Before that function exists, nothing is revealed.
 */
export async function getGiftsRevealedThrough(registryId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("gifts_revealed_through", { p_registry_id: registryId });
  if (error) {
    console.error("[reveal] Failed to read when gifts are revealed:", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}
