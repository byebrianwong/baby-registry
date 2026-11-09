import { supabaseAdmin } from "@/lib/supabase-admin";
import type { EventDetails, EventGuest, LinkedRegistry } from "@/lib/events";

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

/**
 * The event, if the user can manage it: its owner, or a manager of the
 * registry it links to. Null otherwise, and for events that don't exist.
 */
export async function getEventForManager(
  eventId: string,
  userId: string,
): Promise<{ event: EventDetails; isOwner: boolean } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const { data: event } = await supabaseAdmin.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) return null;
  if (event.owner_id === userId) return { event: event as EventDetails, isOwner: true };
  if (event.registry_id && (await canManageRegistry(userId, event.registry_id))) {
    return { event: event as EventDetails, isOwner: false };
  }
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

export async function getLinkedRegistry(registryId: string | null): Promise<LinkedRegistry | null> {
  if (!registryId) return null;
  const { data } = await supabaseAdmin
    .from("registries")
    .select("title, slug")
    .eq("id", registryId)
    .maybeSingle();
  return (data as LinkedRegistry | null) ?? null;
}

export type EventListEntry = EventDetails & {
  event_guests: { rsvp_status: EventGuest["rsvp_status"]; party_size: number; invited_at: string | null }[];
};

/** Events the user owns, and events linked to registries they help manage. */
export async function listEventsForUser(userId: string): Promise<EventListEntry[]> {
  const { data: managed } = await supabaseAdmin
    .from("registry_managers")
    .select("registry_id")
    .eq("user_id", userId);
  const ids = (managed || []).map((m) => m.registry_id as string);

  const query = supabaseAdmin
    .from("events")
    .select("*, event_guests(rsvp_status, party_size, invited_at)")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  const { data } = ids.length > 0
    ? await query.or(`owner_id.eq.${userId},registry_id.in.(${ids.join(",")})`)
    : await query.eq("owner_id", userId);
  return (data || []) as EventListEntry[];
}

/** Events linked to one registry, for the registry's own page. */
export async function listEventsForRegistry(registryId: string): Promise<EventDetails[]> {
  const { data } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("registry_id", registryId)
    .order("event_date", { ascending: true, nullsFirst: false });
  return (data || []) as EventDetails[];
}
