import { supabaseAdmin } from "@/lib/supabase-admin";
import { isUuid } from "@/lib/extension";
import { LISTED_REGISTRY_COLUMNS, type ListedRegistry } from "@/lib/registry-listing";
import type { PersonSummary } from "@/lib/follows";
import type { Group, GroupEvent, GroupMember, GroupSummary } from "@/lib/groups";

// Reads for groups. The group tables have no access rules for the API roles
// (see 20261111223600_groups.sql), so everything goes through the
// service-role client. Every read here is filtered by the signed-in user's
// own id or email, or by a group id the caller has already checked. Never
// export these from a "use server" file, where the browser could call them
// with any id.

/** The user's groups, by name, with how many people are in each. */
export async function listGroupsForOwner(userId: string): Promise<GroupSummary[]> {
  const { data } = await supabaseAdmin
    .from("groups")
    .select("id, name, group_members(count)")
    .eq("owner_id", userId)
    .order("name");
  type Row = { id: string; name: string; group_members: { count: number }[] | null };
  return ((data || []) as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    memberCount: row.group_members?.[0]?.count ?? 0,
  }));
}

/** The group, when it exists and belongs to the user. */
export async function getGroupForOwner(groupId: string, userId: string): Promise<Group | null> {
  if (!isUuid(groupId)) return null;
  const { data } = await supabaseAdmin
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("owner_id", userId)
    .maybeSingle();
  return (data as Group | null) ?? null;
}

/** Everyone in a group, in the order they were added. */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data } = await supabaseAdmin
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at")
    .order("name");
  return (data || []) as GroupMember[];
}

/** Events whose guests came from this group, newest first. */
export async function listGroupEvents(groupId: string): Promise<GroupEvent[]> {
  const { data } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, event_date, created_at, gift_exchanges(drawn_at)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  type Exchange = { drawn_at: string | null };
  type Row = Omit<GroupEvent, "hasExchange" | "drawn"> & { gift_exchanges: Exchange | Exchange[] | null };
  return ((data || []) as Row[]).map(({ gift_exchanges, ...event }) => {
    // gift_exchanges is keyed by event_id, so there's at most one.
    const exchange = Array.isArray(gift_exchanges) ? gift_exchanges[0] : gift_exchanges;
    return { ...event, hasExchange: Boolean(exchange), drawn: Boolean(exchange?.drawn_at) };
  });
}

/** The ids of the groups a registry is shared with. */
export async function listRegistryGroupIds(registryId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("registry_groups").select("group_id").eq("registry_id", registryId);
  return (data || []).map((row) => row.group_id as string);
}

/** The lists shared with a group, for its page. */
export async function listGroupRegistries(groupId: string): Promise<{ id: string; slug: string; title: string }[]> {
  const { data } = await supabaseAdmin
    .from("registry_groups")
    .select("registries(id, slug, title)")
    .eq("group_id", groupId);
  type Registry = { id: string; slug: string; title: string };
  return ((data || []) as unknown as { registries: Registry | null }[])
    .map((row) => row.registries)
    .filter((registry): registry is Registry => Boolean(registry))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The groups someone is in: as a member added with their account, or with
 * the email address on their account. Emails are stored lowercased.
 */
async function groupIdsForViewer(viewer: { id: string; email?: string | null }): Promise<string[]> {
  const email = viewer.email?.trim().toLowerCase();
  const [byProfile, byEmail] = await Promise.all([
    supabaseAdmin.from("group_members").select("group_id").eq("profile_id", viewer.id),
    email
      ? supabaseAdmin.from("group_members").select("group_id").eq("email", email)
      : Promise.resolve({ data: [] as { group_id: string }[] }),
  ]);
  return [...new Set([...(byProfile.data || []), ...(byEmail.data || [])].map((row) => row.group_id as string))];
}

export interface SharedRegistry extends ListedRegistry {
  owner: PersonSummary;
  /** The viewer's groups it was shared with, like "Book club". */
  groupNames: string[];
}

/**
 * Lists shared with the groups the viewer is in, from other people. Someone
 * who blocked the viewer, or whom the viewer blocked, is left out, as on
 * profiles.
 */
export async function listRegistriesSharedWithViewer(viewer: {
  id: string;
  email?: string | null;
}): Promise<SharedRegistry[]> {
  const groupIds = await groupIdsForViewer(viewer);
  if (groupIds.length === 0) return [];

  const [{ data: shares }, { data: groups }] = await Promise.all([
    supabaseAdmin.from("registry_groups").select("registry_id, group_id").in("group_id", groupIds),
    supabaseAdmin.from("groups").select("id, name").in("id", groupIds),
  ]);
  if (!shares || shares.length === 0) return [];
  const groupName = new Map((groups || []).map((g) => [g.id as string, g.name as string]));

  const { data: registries } = await supabaseAdmin
    .from("registries")
    .select(`${LISTED_REGISTRY_COLUMNS}, id, owner_id`)
    .in("id", [...new Set(shares.map((s) => s.registry_id as string))])
    .neq("owner_id", viewer.id);
  type Row = ListedRegistry & { id: string; owner_id: string };
  const rows = (registries || []) as Row[];
  if (rows.length === 0) return [];

  const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
  const [{ data: owners }, { data: blocks }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, public_id, full_name").in("id", ownerIds),
    supabaseAdmin
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewer.id},blocked_id.eq.${viewer.id}`),
  ]);
  const blocked = new Set(
    (blocks || []).map((b) => (b.blocker_id === viewer.id ? (b.blocked_id as string) : (b.blocker_id as string))),
  );
  const ownerById = new Map(
    (owners || []).map((o) => [o.id as string, { public_id: o.public_id as string, full_name: o.full_name as string | null }]),
  );

  return rows
    .filter((row) => ownerById.has(row.owner_id) && !blocked.has(row.owner_id))
    .map(({ id, owner_id, ...registry }) => ({
      ...registry,
      owner: ownerById.get(owner_id)!,
      groupNames: shares
        .filter((s) => s.registry_id === id)
        .map((s) => groupName.get(s.group_id as string))
        .filter((name): name is string => Boolean(name)),
    }));
}

/**
 * The slugs of one person's lists that are shared with the viewer's groups.
 * The profile page shows these to the viewer even when they're private.
 */
export async function sharedRegistrySlugsFrom(
  ownerId: string,
  viewer: { id: string; email?: string | null },
): Promise<Set<string>> {
  const groupIds = await groupIdsForViewer(viewer);
  if (groupIds.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from("registry_groups")
    .select("registries!inner(slug, owner_id)")
    .in("group_id", groupIds)
    .eq("registries.owner_id", ownerId);
  return new Set(
    ((data || []) as unknown as { registries: { slug: string } | null }[])
      .map((row) => row.registries?.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );
}
