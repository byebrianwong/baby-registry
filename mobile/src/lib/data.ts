// Reading and changing registries, as the signed-in user. Every query runs
// under the same access rules (RLS) as the website's dashboard, which reads
// the same tables (src/app/(protected)/dashboard).

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import {
  fundAsRevealed,
  giverNameForOwner,
  isGiftRevealed,
  isOpenReservation,
  itemAsRevealed,
  itemAsUnreserved,
  maskGiverForOwner,
  reservationsHiddenFrom,
} from "@shared/gifts";
import { parseRetailerRegistries, type RetailerRegistry } from "@shared/retailers";

import { useSession } from "@/lib/auth";
import { demo, isDemo } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import type {
  CashFund,
  Category,
  EventType,
  Gift,
  Item,
  ItemInput,
  Registry,
  RegistryDetail,
  RegistrySummary,
  RegistryType,
} from "@/lib/types";

export const keys = {
  registries: (userId: string) => ["registries", userId] as const,
  registry: (id: string) => ["registry", id] as const,
  gifts: (id: string) => ["gifts", id] as const,
};

const REGISTRY_FIELDS =
  "id, owner_id, title, slug, event_date, is_public, description, photo_url, registry_type, event_type, honoree_names, settings, created_at";

// The items are the ones whose registry_id is this registry. The link is named
// because registry_item_placements also joins registries and items, and
// without the name Supabase refuses the query as ambiguous (PGRST201).
const CARD_FIELDS = `${REGISTRY_FIELDS}, registry_items!registry_items_registry_id_fkey(id, quantity_needed, quantity_fulfilled, is_parent_purchased, price, purchases(id, status, reserved_until, created_at, buyer_name, hide_giver))`;

type CardRow = Registry & {
  registry_items:
    | {
        id: string;
        quantity_needed: number;
        quantity_fulfilled: number;
        is_parent_purchased: boolean;
        price: number | null;
        purchases:
          | {
              id: string;
              status: string;
              reserved_until: string | null;
              created_at: string;
              buyer_name: string;
              hide_giver: boolean | null;
            }[]
          | null;
      }[]
    | null;
};

// An owner who hides what's been reserved from themselves sees nothing
// reserved, pledged or given, as on the website (src/lib/gifts.ts).
// Co-managers see it all.
function summarize(row: CardRow, role: "owner" | "manager", userId: string): RegistrySummary {
  const hidden = reservationsHiddenFrom(row, userId);
  const items = (row.registry_items ?? []).map((item) => (hidden ? itemAsUnreserved(item) : item));
  const gifts = (hidden ? [] : items)
    .flatMap((item) => item.purchases ?? [])
    .filter((p) => p.status !== "cancelled")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { registry_items: _items, ...registry } = row;
  return {
    ...registry,
    role,
    itemCount: items.length,
    fulfilledCount: items.filter((i) => i.quantity_fulfilled >= i.quantity_needed).length,
    // Summed the same way as the website's dashboard card, so the two agree.
    totalValue: items.reduce((sum, i) => sum + (i.price ?? 0), 0),
    recentGifts: gifts
      .slice(0, 3)
      // A Secret Santa's gift shows as "Secret Santa", as on the website.
      .map((g) => ({ id: g.id, buyer_name: giverNameForOwner(g), created_at: g.created_at, held: isOpenReservation(g) })),
    reservationsHidden: hidden,
  };
}

async function fetchRegistries(userId: string): Promise<RegistrySummary[]> {
  if (isDemo()) return demo.registries();
  const [owned, managed] = await Promise.all([
    supabase.from("registries").select(CARD_FIELDS).eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("registry_managers").select("registry_id").eq("user_id", userId).eq("role", "manager"),
  ]);
  if (owned.error) throw owned.error;

  const managedIds = (managed.data ?? []).map((row) => row.registry_id as string);
  let shared: CardRow[] = [];
  if (managedIds.length > 0) {
    const result = await supabase
      .from("registries")
      .select(CARD_FIELDS)
      .in("id", managedIds)
      .order("created_at", { ascending: false });
    if (result.error) throw result.error;
    shared = (result.data ?? []) as unknown as CardRow[];
  }

  return [
    ...((owned.data ?? []) as unknown as CardRow[]).map((row) => summarize(row, "owner", userId)),
    ...shared.filter((row) => row.owner_id !== userId).map((row) => summarize(row, "manager", userId)),
  ];
}

export function useRegistries() {
  const { userId } = useSession();
  return useQuery({
    queryKey: keys.registries(userId),
    queryFn: () => fetchRegistries(userId),
    enabled: Boolean(userId),
  });
}

/**
 * When a list's hidden gifts were last revealed to its owner: the day after
 * an event it's linked to (gifts_revealed_through, as on the website). The
 * database already keeps unrevealed gifts from the owner; filtering by this
 * too keeps the app right if that rule isn't in place yet. Null when nothing
 * is revealed.
 */
async function fetchRevealedThrough(registryId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("gifts_revealed_through", { p_registry_id: registryId });
  return !error && typeof data === "string" ? data : null;
}

async function fetchRegistry(id: string, userId: string): Promise<RegistryDetail> {
  if (isDemo()) return demo.registry(id);
  const [registry, categories, items, funds, suggestions] = await Promise.all([
    supabase.from("registries").select(REGISTRY_FIELDS).eq("id", id).single(),
    supabase.from("categories").select("id, registry_id, name, sort_order").eq("registry_id", id).order("sort_order"),
    supabase
      .from("registry_items")
      .select(
        "id, registry_id, category_id, title, external_url, image_url, price, quantity_needed, quantity_fulfilled, is_essential, is_parent_purchased, is_open_to_used, minimum_condition, notes, sort_order, created_at, purchases(id, status, reserved_until, buyer_name, quantity, created_at)"
      )
      .eq("registry_id", id)
      .order("sort_order")
      .order("created_at", { ascending: false })
      // Newest first, as the website's owner page lists them.
      .order("created_at", { referencedTable: "purchases", ascending: false }),
    supabase
      .from("cash_funds")
      .select("id, registry_id, title, description, goal_amount, current_amount")
      .eq("registry_id", id)
      .order("created_at"),
    supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("registry_id", id)
      .eq("status", "pending"),
  ]);
  if (registry.error) throw registry.error;
  if (categories.error) throw categories.error;
  if (items.error) throw items.error;

  const row = registry.data as Registry;
  const hidden = reservationsHiddenFrom(row, userId);
  const allItems = (items.data ?? []) as Item[];
  const allFunds = (funds.data ?? []) as CashFund[];
  if (!hidden) {
    return {
      registry: row,
      role: row.owner_id === userId ? "owner" : "manager",
      categories: (categories.data ?? []) as Category[],
      items: allItems,
      funds: allFunds,
      pendingSuggestions: suggestions.count ?? 0,
      reservationsHidden: false,
    };
  }

  // Hidden from the owner: only gifts revealed after an event count.
  const [through, fundGifts] = await Promise.all([
    fetchRevealedThrough(id),
    allFunds.length > 0
      ? supabase
          .from("purchases")
          .select("cash_fund_id, amount, status, created_at")
          .in("cash_fund_id", allFunds.map((f) => f.id))
      : Promise.resolve({ data: [] as { cash_fund_id: string; amount: number | null; status: string; created_at: string }[] }),
  ]);
  const revealed = <P extends { created_at?: string }>(list: P[]) =>
    list.filter((p) => p.created_at && isGiftRevealed(p.created_at, through));
  const shownItems = allItems.map((item) => {
    const gifts = revealed(item.purchases ?? []);
    return { ...(gifts.length > 0 ? itemAsRevealed(item, gifts) : itemAsUnreserved(item)), purchases: gifts };
  });
  const fundRows = revealed((fundGifts.data ?? []) as { cash_fund_id: string; amount: number | null; status: string; created_at: string }[]);
  return {
    registry: row,
    role: row.owner_id === userId ? "owner" : "manager",
    categories: (categories.data ?? []) as Category[],
    items: shownItems,
    funds: allFunds.map((fund) => fundAsRevealed(fund, fundRows.filter((p) => p.cash_fund_id === fund.id))),
    pendingSuggestions: suggestions.count ?? 0,
    reservationsHidden: true,
    revealedCount:
      shownItems.reduce((sum, item) => sum + item.purchases.filter((p) => p.status !== "cancelled").length, 0) +
      fundRows.filter((p) => p.status !== "cancelled").length,
  };
}

/**
 * The owner's registries at stores, from the registry's settings, as the
 * website's dashboard reads them. The owner and co-managers can read settings
 * (the registries row, under RLS), and fetchRegistry already does. Null for
 * registries other than baby registries, which don't show store registries,
 * as on the website.
 */
export function storeRegistries(registry: Registry): RetailerRegistry[] | null {
  return registry.registry_type === "baby" ? parseRetailerRegistries(registry.settings) : null;
}

export function useRegistry(id: string | undefined) {
  const { userId } = useSession();
  return useQuery({
    queryKey: keys.registry(id ?? ""),
    queryFn: () => fetchRegistry(id!, userId),
    enabled: Boolean(id && userId),
  });
}

type GiftRow = Omit<Gift, "for_title" | "kind"> & {
  registry_items?: { title: string } | null;
  cash_funds?: { title: string } | null;
};

const GIFT_FIELDS =
  "id, buyer_name, buyer_email, quantity, amount, status, reserved_until, message, created_at, registry_item_id, cash_fund_id, hide_giver";

async function fetchGifts(registryId: string, userId: string): Promise<Gift[]> {
  if (isDemo()) return demo.gifts(registryId);
  // Gifts point at an item or a cash fund. Each query keeps only the ones on this registry.
  const [registry, forItems, forFunds] = await Promise.all([
    supabase.from("registries").select("owner_id, settings").eq("id", registryId).single(),
    supabase
      .from("purchases")
      .select(`${GIFT_FIELDS}, registry_items!registry_item_id!inner(title, registry_id)`)
      .eq("registry_items.registry_id", registryId)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchases")
      .select(`${GIFT_FIELDS}, cash_funds!cash_fund_id!inner(title, registry_id)`)
      .eq("cash_funds.registry_id", registryId)
      .order("created_at", { ascending: false }),
  ]);
  if (registry.error) throw registry.error;
  if (forItems.error) throw forItems.error;
  if (forFunds.error) throw forFunds.error;
  const gifts: Gift[] = [
    ...((forItems.data ?? []) as unknown as GiftRow[]).map((row) => toGift(row, "item")),
    ...((forFunds.data ?? []) as unknown as GiftRow[]).map((row) => toGift(row, "fund")),
  ];
  // An owner who hides what's been reserved from themselves sees only the
  // gifts revealed after an event, as on the website.
  if (reservationsHiddenFrom(registry.data, userId)) {
    const through = await fetchRevealedThrough(registryId);
    return gifts
      .filter((gift) => isGiftRevealed(gift.created_at, through))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return gifts.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// A Secret Santa's gift comes back as "Secret Santa" with no email, as on
// the website's owner pages. The message stays.
function toGift(row: GiftRow, kind: "item" | "fund"): Gift {
  const { registry_items, cash_funds, ...rest } = row;
  return maskGiverForOwner({
    ...rest,
    hide_giver: Boolean(rest.hide_giver),
    kind,
    for_title: (kind === "item" ? registry_items?.title : cash_funds?.title) ?? "",
  });
}

export function useGifts(registryId: string | undefined) {
  const { userId } = useSession();
  return useQuery({
    queryKey: keys.gifts(registryId ?? ""),
    queryFn: () => fetchGifts(registryId!, userId),
    enabled: Boolean(registryId && userId),
  });
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

function cleanInput(input: ItemInput) {
  const quantity = Math.max(1, Math.min(99, Math.round(input.quantity_needed) || 1));
  return {
    title: input.title.trim(),
    external_url: input.external_url?.trim() || null,
    image_url: input.image_url?.trim() || null,
    price: input.price != null && Number.isFinite(input.price) && input.price > 0 ? input.price : null,
    quantity_needed: quantity,
    category_id: input.category_id,
    is_essential: input.is_essential,
    is_open_to_used: input.is_open_to_used,
    minimum_condition: input.is_open_to_used ? (input.minimum_condition ?? "like-new") : null,
    notes: input.notes?.trim() || null,
  };
}

/** Updates the cached registry right away, so the screen changes before the save finishes. */
function patchCachedItems(queryClient: QueryClient, registryId: string, change: (items: Item[]) => Item[]) {
  const key = keys.registry(registryId);
  const previous = queryClient.getQueryData<RegistryDetail>(key);
  if (previous) queryClient.setQueryData<RegistryDetail>(key, { ...previous, items: change(previous.items) });
  return previous;
}

function useInvalidateRegistry() {
  const queryClient = useQueryClient();
  return (registryId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.registry(registryId) }),
      queryClient.invalidateQueries({ queryKey: ["registries"] }),
    ]);
}

export function useAddItem() {
  const invalidate = useInvalidateRegistry();
  return useMutation({
    mutationFn: async ({ registryId, input }: { registryId: string; input: ItemInput }) => {
      const values = cleanInput(input);
      const bought = input.is_parent_purchased;
      if (isDemo()) {
        return demo.addItem(registryId, {
          ...values,
          is_parent_purchased: bought,
          quantity_fulfilled: bought ? values.quantity_needed : 0,
        });
      }
      const { data, error } = await supabase
        .from("registry_items")
        .insert({
          ...values,
          registry_id: registryId,
          is_parent_purchased: bought,
          // The same as the website's add-item dialog: bought by the owner means fully given.
          quantity_fulfilled: bought ? values.quantity_needed : 0,
        })
        .select("id, title")
        .single();
      if (error) throw error;
      return data as { id: string; title: string };
    },
    onSuccess: (_data, { registryId }) => invalidate(registryId),
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistry();
  return useMutation({
    mutationFn: async ({ item, input }: { item: Item; input: ItemInput }) => {
      const values = cleanInput(input);
      if (isDemo()) {
        const boughtChanged = input.is_parent_purchased !== item.is_parent_purchased;
        demo.updateItem(item.id, {
          ...values,
          is_parent_purchased: input.is_parent_purchased,
          quantity_fulfilled: boughtChanged ? (input.is_parent_purchased ? values.quantity_needed : 0) : item.quantity_fulfilled,
        });
        return;
      }
      const { error } = await supabase.from("registry_items").update(values).eq("id", item.id);
      if (error) throw error;
      if (input.is_parent_purchased !== item.is_parent_purchased) {
        await setBoughtMyself(item.id, input.is_parent_purchased, values.quantity_needed);
      }
    },
    onMutate: ({ item, input }) => ({
      previous: patchCachedItems(queryClient, item.registry_id, (items) =>
        items.map((i) => (i.id === item.id ? { ...i, ...cleanInput(input), is_parent_purchased: input.is_parent_purchased } : i))
      ),
    }),
    onError: (_error, { item }, context) => {
      if (context?.previous) queryClient.setQueryData(keys.registry(item.registry_id), context.previous);
    },
    onSettled: (_data, _error, { item }) => invalidate(item.registry_id),
  });
}

async function setBoughtMyself(itemId: string, bought: boolean, quantityNeeded: number) {
  if (isDemo()) {
    demo.updateItem(itemId, { is_parent_purchased: bought, quantity_fulfilled: bought ? quantityNeeded : 0 });
    return;
  }
  // The same as the website's toggleParentPurchased (src/lib/actions/registry.ts).
  // A database trigger corrects quantity_fulfilled, so unmarking keeps guests'
  // gifts counted (supabase/migrations/20261113213004_gift_counts.sql).
  const { error } = await supabase
    .from("registry_items")
    .update({
      is_parent_purchased: bought,
      quantity_fulfilled: bought ? quantityNeeded : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  if (error) throw error;
}

/** Quick changes from a list row: most wanted, bought it myself. */
export function useToggleItem() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistry();
  return useMutation({
    mutationFn: async ({ item, field }: { item: Item; field: "is_essential" | "is_parent_purchased" }) => {
      if (field === "is_parent_purchased") {
        await setBoughtMyself(item.id, !item.is_parent_purchased, item.quantity_needed);
      } else if (isDemo()) {
        demo.updateItem(item.id, { is_essential: !item.is_essential });
      } else {
        const { error } = await supabase.from("registry_items").update({ is_essential: !item.is_essential }).eq("id", item.id);
        if (error) throw error;
      }
    },
    onMutate: ({ item, field }) => ({
      previous: patchCachedItems(queryClient, item.registry_id, (items) =>
        items.map((i) => {
          if (i.id !== item.id) return i;
          if (field === "is_essential") return { ...i, is_essential: !i.is_essential };
          const bought = !i.is_parent_purchased;
          return { ...i, is_parent_purchased: bought, quantity_fulfilled: bought ? i.quantity_needed : 0 };
        })
      ),
    }),
    onError: (_error, { item }, context) => {
      if (context?.previous) queryClient.setQueryData(keys.registry(item.registry_id), context.previous);
    },
    onSettled: (_data, _error, { item }) => invalidate(item.registry_id),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRegistry();
  return useMutation({
    mutationFn: async (item: Item) => {
      if (isDemo()) return demo.deleteItem(item.id);
      const { error } = await supabase.from("registry_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onMutate: (item) => ({
      previous: patchCachedItems(queryClient, item.registry_id, (items) => items.filter((i) => i.id !== item.id)),
    }),
    onError: (_error, item, context) => {
      if (context?.previous) queryClient.setQueryData(keys.registry(item.registry_id), context.previous);
    },
    onSettled: (_data, _error, item) => invalidate(item.registry_id),
  });
}

export function useCancelGift(registryId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: async (gift: Gift) => {
      if (isDemo()) return demo.cancelGift(registryId, gift.id);
      // The database checks that the caller manages the registry (016_rpc_caller_from_auth_uid.sql).
      const { error } = await supabase.rpc("cancel_reservation", {
        p_purchase_id: gift.id,
        p_owner_id: session?.user.id,
      });
      if (error) throw error;
    },
    onMutate: (gift) => {
      const key = keys.gifts(registryId);
      const previous = queryClient.getQueryData<Gift[]>(key);
      if (previous) {
        queryClient.setQueryData<Gift[]>(
          key,
          previous.map((g) => (g.id === gift.id ? { ...g, status: "cancelled" } : g))
        );
      }
      return { previous };
    },
    onError: (_error, _gift, context) => {
      if (context?.previous) queryClient.setQueryData(keys.gifts(registryId), context.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.gifts(registryId) }),
        queryClient.invalidateQueries({ queryKey: keys.registry(registryId) }),
        queryClient.invalidateQueries({ queryKey: ["registries"] }),
      ]),
  });
}

const BABY_DEFAULT_CATEGORIES = [
  "Nursery & Sleep",
  "Feeding",
  "Diapering",
  "Gear & Travel",
  "Bath",
  "Clothing",
  "Health & Safety",
  "Toys & Books",
  "Maternity & Postpartum",
  "Gifts & Extras",
];

function slugFor(title: string) {
  // The same shape as the website's generateSlug (src/lib/actions/registry.ts).
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 8)
  );
}

export interface NewRegistryInput {
  title: string;
  registryType: RegistryType;
  eventType: EventType | null;
  eventDate: string | null;
  isPublic: boolean;
}

export function useCreateRegistry() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  return useMutation({
    mutationFn: async (input: NewRegistryInput) => {
      if (isDemo()) {
        return demo.createRegistry(
          {
            title: input.title.trim(),
            registry_type: input.registryType,
            event_type: input.registryType === "personal" ? input.eventType : null,
            event_date: input.eventDate,
            is_public: input.isPublic,
          },
          input.registryType === "baby" ? BABY_DEFAULT_CATEGORIES : []
        );
      }
      const userId = session?.user.id;
      if (!userId) throw new Error("You're signed out. Sign in again.");
      const { data, error } = await supabase
        .from("registries")
        .insert({
          owner_id: userId,
          title: input.title.trim(),
          slug: slugFor(input.title.trim() || "registry"),
          event_date: input.eventDate,
          is_public: input.isPublic,
          listed_on_profile: false,
          registry_type: input.registryType,
          event_type: input.registryType === "personal" ? input.eventType : null,
          settings: { tax_enabled: false },
        })
        .select("id")
        .single();
      if (error) throw error;
      // Baby registries start with the website's 10 categories. Personal ones start with none.
      if (input.registryType === "baby") {
        await supabase.from("categories").insert(
          BABY_DEFAULT_CATEGORIES.map((name, index) => ({ registry_id: data.id, name, sort_order: index }))
        );
      }
      return data as { id: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["registries"] }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registryId, name, sortOrder }: { registryId: string; name: string; sortOrder: number }) => {
      if (isDemo()) return demo.createCategory(registryId, name.trim(), sortOrder);
      const { data, error } = await supabase
        .from("categories")
        .insert({ registry_id: registryId, name: name.trim(), sort_order: sortOrder })
        .select("id, registry_id, name, sort_order")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: (_data, { registryId }) => queryClient.invalidateQueries({ queryKey: keys.registry(registryId) }),
  });
}

/** A friendly message for an error from Supabase or the network. */
export function errorMessage(error: unknown): string {
  const fallback = "Something went wrong. Try again.";
  if (!error) return fallback;
  const message = typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
  const code = typeof error === "object" && "code" in error ? String((error as { code: unknown }).code ?? "") : "";
  if (/network|fetch|timed? ?out|offline/i.test(message)) return "You're offline, or Regibee can't be reached. Try again.";
  // The access rules (RLS) turned it down.
  if (code === "42501" || /row-level security/i.test(message)) return "You don't have access to change this registry.";
  // Database and API errors are written for developers. Sign-in errors are written for people.
  if (/^(\d{2}[0-9A-Z]{3}|PGRST\d+)$/.test(code)) return fallback;
  return message || fallback;
}
