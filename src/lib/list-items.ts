import { supabaseAdmin } from "@/lib/supabase-admin";
import { reservationsHiddenFrom } from "@/lib/gifts";

// The items on a list. An item's home list is registry_items.registry_id, the
// list it was first saved to. A placement in registry_item_placements puts it
// on more of its owner's lists, with its own category on each (see
// supabase/migrations/20261112062733_item_placements.sql). Gifts belong to the
// item, so a gift reserved through any of its lists shows on all of them.
//
// Everything here reads with the service-role client and takes raw ids, so
// only call it from server code after checking the caller may see the lists,
// and never export it from a "use server" file.

/** The columns every loader below needs, whatever else the caller selects. */
interface ItemRow {
  id: string;
  registry_id: string;
  category_id: string | null;
  sort_order: number;
  created_at: string;
}

/** Enough of an item to match it by its store link. */
export interface LinkRow extends ItemRow {
  title: string;
  external_url: string | null;
}
export const LINK_COLUMNS = "id, registry_id, category_id, sort_order, created_at, title, external_url";

/** An item as it appears on one list. */
export type ListItem<T extends ItemRow> = T & {
  /** The list it was first saved to. */
  home_registry_id: string;
  /**
   * True when it's on this list through a placement. Then `registry_id` is
   * this list and `category_id` is its category here, so code that groups a
   * list's items works unchanged.
   */
  placed: boolean;
};

export interface Placement {
  item_id: string;
  registry_id: string;
  category_id: string | null;
  created_at: string;
}

/**
 * Before the placements migration runs, the table doesn't exist. Lists then
 * work as they did, with only their own items.
 */
function tableMissing(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function byListOrder(a: ItemRow, b: ItemRow) {
  return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

/** The placements on these lists. */
export async function loadPlacements(registryIds: string[]): Promise<Placement[]> {
  if (registryIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("registry_item_placements")
    .select("item_id, registry_id, category_id, created_at")
    .in("registry_id", registryIds)
    .order("created_at");
  if (error) {
    if (tableMissing(error)) return [];
    throw error;
  }
  return (data ?? []) as Placement[];
}

/** The placements of these items, oldest first. */
async function loadPlacementsOfItems(itemIds: string[]): Promise<Placement[]> {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("registry_item_placements")
    .select("item_id, registry_id, category_id, created_at")
    .in("item_id", itemIds)
    .order("created_at");
  if (error) {
    if (tableMissing(error)) return [];
    throw error;
  }
  return (data ?? []) as Placement[];
}

/**
 * Every item on each of these lists, keyed by list id: the items saved to it,
 * then the ones placed on it, in list order. `columns` is what to read from
 * registry_items, and must include the columns in ItemRow.
 */
export async function loadItemsForLists<T extends ItemRow>(
  registryIds: string[],
  columns = "*",
): Promise<Map<string, ListItem<T>[]>> {
  const result = new Map<string, ListItem<T>[]>(registryIds.map((id) => [id, []]));
  if (registryIds.length === 0) return result;

  const [{ data: home, error: homeError }, placements] = await Promise.all([
    supabaseAdmin.from("registry_items").select(columns).in("registry_id", registryIds),
    loadPlacements(registryIds),
  ]);
  if (homeError) throw homeError;

  for (const item of (home ?? []) as unknown as T[]) {
    result.get(item.registry_id)?.push({ ...item, home_registry_id: item.registry_id, placed: false });
  }

  // A placement on the item's own home list would show it twice.
  const placedIds = [...new Set(placements.map((p) => p.item_id))];
  if (placedIds.length > 0) {
    const { data: placedItems, error } = await supabaseAdmin
      .from("registry_items")
      .select(columns)
      .in("id", placedIds);
    if (error) throw error;
    const byId = new Map(((placedItems ?? []) as unknown as T[]).map((item) => [item.id, item]));
    for (const p of placements) {
      const item = byId.get(p.item_id);
      if (!item || item.registry_id === p.registry_id) continue;
      result.get(p.registry_id)?.push({
        ...item,
        registry_id: p.registry_id,
        category_id: p.category_id,
        home_registry_id: item.registry_id,
        placed: true,
      });
    }
  }

  for (const items of result.values()) items.sort(byListOrder);
  return result;
}

/** Every item on one list: its own items and the ones placed on it. */
export async function loadListItems<T extends ItemRow>(registryId: string, columns = "*"): Promise<ListItem<T>[]> {
  return (await loadItemsForLists<T>([registryId], columns)).get(registryId) ?? [];
}

/** For each item, the ids of the lists it's on, its home list first. */
export async function listsForItems(itemIds: string[]): Promise<Map<string, string[]>> {
  const ids = [...new Set(itemIds)];
  const result = new Map<string, string[]>();
  if (ids.length === 0) return result;
  const [{ data: rows, error }, placements] = await Promise.all([
    supabaseAdmin.from("registry_items").select("id, registry_id").in("id", ids),
    loadPlacementsOfItems(ids),
  ]);
  if (error) throw error;
  for (const row of rows ?? []) result.set(row.id as string, [row.registry_id as string]);
  for (const p of placements) {
    const lists = result.get(p.item_id);
    if (lists && !lists.includes(p.registry_id)) lists.push(p.registry_id);
  }
  return result;
}

/** Whether the item is on this list, as its home or through a placement. */
export async function isItemOnList(itemId: string, registryId: string): Promise<boolean> {
  return ((await listsForItems([itemId])).get(itemId) ?? []).includes(registryId);
}

/**
 * The items, among these, whose gifts this person mustn't see: they own a list
 * the item is on, and that list hides what's been reserved from them (see
 * src/lib/gifts.ts). A gift belongs to the item, so an item stays hidden on
 * every list it's on, the most hidden one wins.
 */
export async function itemsHiddenFromOwner(itemIds: string[], viewerId: string | null | undefined): Promise<Set<string>> {
  const hidden = new Set<string>();
  if (!viewerId || itemIds.length === 0) return hidden;
  const lists = await listsForItems(itemIds);
  const listIds = [...new Set([...lists.values()].flat())];
  if (listIds.length === 0) return hidden;
  const { data: registries, error } = await supabaseAdmin
    .from("registries")
    .select("id, owner_id, settings")
    .in("id", listIds);
  if (error) throw error;
  const hiding = new Set(
    (registries ?? [])
      .filter((r) => reservationsHiddenFrom(r as { owner_id: string; settings: unknown }, viewerId))
      .map((r) => r.id as string),
  );
  if (hiding.size === 0) return hidden;
  for (const [itemId, ids] of lists) {
    if (ids.some((id) => hiding.has(id))) hidden.add(itemId);
  }
  return hidden;
}
