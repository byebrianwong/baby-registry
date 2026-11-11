// "Look around first": the app with the website's sample registry
// (src/lib/demo-data.ts), kept in memory. Nothing in the demo reaches the
// database, and closing the app resets it.

import {
  DEMO_CASH_FUNDS,
  DEMO_CATEGORIES,
  DEMO_ITEMS,
  DEMO_REGISTRY,
  demoDueDate,
  demoPurchases,
  demoSuggestions,
} from "@shared/demo-data";
import { GIFT_HOLD_DAYS, isOpenReservation } from "@shared/gifts";

import type { Category, Gift, Item, Registry, RegistryDetail, RegistrySummary } from "@/lib/types";

export const DEMO_USER_ID = "demo-user";

let active = false;

/** True while someone is looking around without an account. */
export function isDemo() {
  return active;
}

export function setDemoActive(value: boolean) {
  if (active && !value) store = null;
  active = value;
}

interface Store {
  details: Map<string, RegistryDetail>;
  gifts: Map<string, Gift[]>;
}

let store: Store | null = null;

function today() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const HOUR_MS = 3_600_000;

// The website's sample gifts were all given before gift holds existed, so they
// count as given. Here two are still held, reserved this many hours ago, so the
// demo shows both kinds (src/lib/gifts.ts).
const HELD_HOURS_AGO: Record<string, number> = { "purchase-10": 3, "purchase-9": 30 };

function build(): Store {
  const day = today();
  const registry: Registry = {
    id: "demo",
    owner_id: DEMO_USER_ID,
    title: DEMO_REGISTRY.title,
    slug: DEMO_REGISTRY.slug,
    event_date: demoDueDate(day),
    is_public: DEMO_REGISTRY.is_public,
    description: DEMO_REGISTRY.description,
    photo_url: null,
    registry_type: "baby",
    event_type: null,
    honoree_names: DEMO_REGISTRY.honoree_names,
    created_at: new Date().toISOString(),
  };
  const categories: Category[] = DEMO_CATEGORIES.map((c) => ({ ...c, registry_id: "demo" }));
  const items: Item[] = DEMO_ITEMS.map((item) => ({
    ...item,
    registry_id: "demo",
    minimum_condition: (item.minimum_condition ?? null) as Item["minimum_condition"],
    created_at: new Date().toISOString(),
    // demo.registry fills these in from the gifts.
    purchases: [],
  }));
  const titles = new Map<string, string>([
    ...items.map((i) => [i.id, i.title] as const),
    ...DEMO_CASH_FUNDS.map((f) => [f.id, f.title] as const),
  ]);
  const gifts: Gift[] = demoPurchases(day).map((p) => {
    const heldHoursAgo = HELD_HOURS_AGO[p.id];
    const reservedAt = heldHoursAgo === undefined ? null : Date.now() - heldHoursAgo * HOUR_MS;
    return {
      id: p.id,
      buyer_name: p.buyer_name,
      buyer_email: p.buyer_email ?? null,
      quantity: p.quantity,
      amount: p.amount ?? null,
      status: p.status,
      reserved_until: reservedAt === null ? null : new Date(reservedAt + GIFT_HOLD_DAYS * 24 * HOUR_MS).toISOString(),
      message: p.message ?? null,
      created_at: reservedAt === null ? p.created_at : new Date(reservedAt).toISOString(),
      registry_item_id: p.registry_item_id ?? null,
      cash_fund_id: p.cash_fund_id ?? null,
      kind: p.cash_fund_id ? "fund" : "item",
      for_title: titles.get((p.registry_item_id ?? p.cash_fund_id) as string) ?? "",
    };
  });
  const detail: RegistryDetail = {
    registry,
    role: "owner",
    categories,
    items,
    funds: DEMO_CASH_FUNDS.map((f) => ({ ...f, registry_id: "demo" })),
    pendingSuggestions: demoSuggestions(day).filter((s) => s.status === "pending").length,
  };
  return { details: new Map([["demo", detail]]), gifts: new Map([["demo", gifts]]) };
}

function current() {
  store ??= build();
  return store;
}

function summary(detail: RegistryDetail, gifts: Gift[]): RegistrySummary {
  const active = gifts
    .filter((g) => g.status !== "cancelled" && g.kind === "item")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    ...detail.registry,
    role: detail.role,
    itemCount: detail.items.length,
    fulfilledCount: detail.items.filter((i) => i.quantity_fulfilled >= i.quantity_needed).length,
    totalValue: detail.items.reduce((sum, i) => sum + (i.price ?? 0), 0),
    recentGifts: active
      .slice(0, 3)
      .map((g) => ({ id: g.id, buyer_name: g.buyer_name, created_at: g.created_at, held: isOpenReservation(g) })),
  };
}

function detailFor(id: string) {
  const detail = current().details.get(id);
  if (!detail) throw new Error("That registry isn't in the demo.");
  return detail;
}

function setItems(registryId: string, change: (items: Item[]) => Item[]) {
  const detail = detailFor(registryId);
  current().details.set(registryId, { ...detail, items: change(detail.items) });
}

function itemRegistry(itemId: string) {
  for (const [id, detail] of current().details) if (detail.items.some((i) => i.id === itemId)) return id;
  throw new Error("That item isn't in the demo.");
}

let nextId = 1;
const newId = (prefix: string) => `${prefix}-new-${nextId++}`;

export const demo = {
  registries(): RegistrySummary[] {
    return [...current().details.values()]
      .map((d) => summary(d, current().gifts.get(d.registry.id) ?? []))
      .reverse();
  },
  registry(id: string): RegistryDetail {
    const detail = detailFor(id);
    // Read from the gifts each time, so cancelling a gift shows on its item too.
    const gifts = [...(current().gifts.get(id) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      ...detail,
      items: detail.items.map((item) => ({
        ...item,
        purchases: gifts
          .filter((g) => g.registry_item_id === item.id)
          .map(({ id, status, reserved_until, buyer_name, quantity }) => ({ id, status, reserved_until, buyer_name, quantity })),
      })),
    };
  },
  gifts(id: string): Gift[] {
    return [...(current().gifts.get(id) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  addItem(registryId: string, values: Omit<Item, "id" | "registry_id" | "sort_order" | "created_at" | "purchases">) {
    const item: Item = {
      ...values,
      id: newId("item"),
      registry_id: registryId,
      sort_order: 0,
      created_at: new Date().toISOString(),
      purchases: [],
    };
    setItems(registryId, (items) => [item, ...items]);
    return { id: item.id, title: item.title };
  },
  updateItem(itemId: string, patch: Partial<Item>) {
    setItems(itemRegistry(itemId), (items) => items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  },
  deleteItem(itemId: string) {
    setItems(itemRegistry(itemId), (items) => items.filter((i) => i.id !== itemId));
  },
  cancelGift(registryId: string, giftId: string) {
    const gifts = current().gifts.get(registryId) ?? [];
    const gift = gifts.find((g) => g.id === giftId);
    current().gifts.set(
      registryId,
      gifts.map((g) => (g.id === giftId ? { ...g, status: "cancelled" } : g))
    );
    if (gift?.registry_item_id) {
      setItems(registryId, (items) =>
        items.map((i) => (i.id === gift.registry_item_id ? { ...i, quantity_fulfilled: Math.max(0, i.quantity_fulfilled - gift.quantity) } : i))
      );
    }
  },
  createRegistry(input: { title: string; registry_type: Registry["registry_type"]; event_type: Registry["event_type"]; event_date: string | null; is_public: boolean }, categoryNames: string[]) {
    const id = newId("registry");
    const registry: Registry = {
      id,
      owner_id: DEMO_USER_ID,
      title: input.title,
      slug: id,
      event_date: input.event_date,
      is_public: input.is_public,
      description: null,
      photo_url: null,
      registry_type: input.registry_type,
      event_type: input.event_type,
      honoree_names: null,
      created_at: new Date().toISOString(),
    };
    current().details.set(id, {
      registry,
      role: "owner",
      categories: categoryNames.map((name, index) => ({ id: newId("cat"), registry_id: id, name, sort_order: index })),
      items: [],
      funds: [],
      pendingSuggestions: 0,
    });
    current().gifts.set(id, []);
    return { id };
  },
  createCategory(registryId: string, name: string, sortOrder: number): Category {
    const category: Category = { id: newId("cat"), registry_id: registryId, name, sort_order: sortOrder };
    const detail = detailFor(registryId);
    current().details.set(registryId, { ...detail, categories: [...detail.categories, category] });
    return category;
  },
};
