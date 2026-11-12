import { supabaseAdmin } from "@/lib/supabase-admin";
import { itemsHiddenFromOwner, loadItemsForLists } from "@/lib/list-items";
import { hidesReservations, itemAsUnreserved, readReservationPrivacy } from "@/lib/gifts";
import { occasionLabel } from "@/lib/registry-copy";
import type { PersonalEventType, RegistryType } from "@/lib/types";

// The Saved tab: every item on every list someone owns, once each, with the
// lists it's on. Reads with the service-role client, so only call it from
// server code with the id of the signed-in account.

export interface SavedList {
  id: string;
  title: string;
  registryType: RegistryType;
  eventType: PersonalEventType | null;
  /** "Wishlist", "Baby registry", "Birthday"… */
  kindLabel: string;
  /** The child's name, for a list kept for a child. */
  forChild: string | null;
  /**
   * The person's own wishlist: a personal list with no particular occasion,
   * not kept for a child. "Make just a wishlist" makes one.
   */
  isOwnWishlist: boolean;
  /** Whether the list hides what's been reserved from its owner. */
  hidesReservations: boolean;
  categories: { id: string; name: string }[];
}

/**
 * As the owner may see it. "have" is an item they marked as bought
 * themselves. On a list that hides what's been reserved, a gifted item is
 * still "wanted".
 */
export type SavedItemStatus = "wanted" | "gifted" | "have";

export interface SavedItem {
  id: string;
  title: string;
  imageUrl: string | null;
  externalUrl: string | null;
  price: number | null;
  createdAt: string;
  /** The lists it's on, the one it was first saved to first. */
  listIds: string[];
  status: SavedItemStatus;
}

export interface SavedItemsData {
  lists: SavedList[];
  items: SavedItem[];
}

interface ListRow {
  id: string;
  title: string;
  registry_type: RegistryType | null;
  event_type: PersonalEventType | null;
  honoree_names: string | null;
  settings: unknown;
  created_at: string;
}

interface ItemRow {
  id: string;
  registry_id: string;
  category_id: string | null;
  sort_order: number;
  created_at: string;
  title: string;
  image_url: string | null;
  external_url: string | null;
  price: number | null;
  quantity_needed: number;
  quantity_fulfilled: number;
  is_parent_purchased: boolean;
}

const ITEM_COLUMNS =
  "id, registry_id, category_id, sort_order, created_at, title, image_url, external_url, price, quantity_needed, quantity_fulfilled, is_parent_purchased";

export function isOwnWishlist(list: Pick<ListRow, "registry_type" | "event_type" | "settings">): boolean {
  return (
    list.registry_type === "personal" &&
    (list.event_type === "other" || list.event_type === null) &&
    !readReservationPrivacy(list.settings).for_child
  );
}

function toSavedList(row: ListRow, categories: { id: string; name: string }[]): SavedList {
  const registryType = row.registry_type ?? "baby";
  const forChild = readReservationPrivacy(row.settings).for_child ? row.honoree_names?.trim() || null : null;
  return {
    id: row.id,
    title: row.title,
    registryType,
    eventType: row.event_type ?? null,
    kindLabel: occasionLabel(registryType, row.event_type ?? null),
    forChild,
    isOwnWishlist: isOwnWishlist(row),
    hidesReservations: hidesReservations(row.settings),
    categories,
  };
}

export async function loadSavedItems(userId: string): Promise<SavedItemsData> {
  const { data: registries, error } = await supabaseAdmin
    .from("registries")
    .select("id, title, registry_type, event_type, honoree_names, settings, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Your own wishlist first, then the rest newest first, like My registries.
  const rows = ((registries ?? []) as ListRow[]).sort(
    (a, b) => Number(isOwnWishlist(b)) - Number(isOwnWishlist(a)),
  );
  if (rows.length === 0) return { lists: [], items: [] };

  const ids = rows.map((r) => r.id);
  const [itemsByList, { data: categories }] = await Promise.all([
    loadItemsForLists<ItemRow>(ids, ITEM_COLUMNS),
    supabaseAdmin.from("categories").select("id, name, registry_id").in("registry_id", ids).order("sort_order"),
  ]);

  const lists = rows.map((row) =>
    toSavedList(
      row,
      (categories ?? [])
        .filter((c) => c.registry_id === row.id)
        .map((c) => ({ id: c.id as string, name: c.name as string })),
    ),
  );

  // Gifts belong to the item, so an item on a list that hides what's been
  // reserved looks still wanted, however many lists it's on.
  const allItemIds = [...new Set([...itemsByList.values()].flat().map((item) => item.id))];
  const hidden = await itemsHiddenFromOwner(allItemIds, userId);

  const items = new Map<string, SavedItem>();
  for (const list of lists) {
    for (const row of itemsByList.get(list.id) ?? []) {
      const existing = items.get(row.id);
      if (existing) {
        if (existing.listIds.includes(list.id)) continue;
        if (row.home_registry_id === list.id) existing.listIds.unshift(list.id);
        else existing.listIds.push(list.id);
        continue;
      }
      const item = hidden.has(row.id) ? itemAsUnreserved(row) : row;
      items.set(row.id, {
        id: row.id,
        title: row.title,
        imageUrl: row.image_url,
        externalUrl: row.external_url,
        price: row.price,
        createdAt: row.created_at,
        listIds: [list.id],
        status: item.is_parent_purchased
          ? "have"
          : item.quantity_fulfilled >= item.quantity_needed
            ? "gifted"
            : "wanted",
      });
    }
  }

  return {
    lists,
    items: [...items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
