// Shared between the site and the browser extension (extension/). Keep this
// file free of server-only imports: the extension bundles it too.

import {
  classifyStoreLink,
  storeItemKey,
  type RetailerRegistry,
  type StoreId,
} from "@/lib/retailers";

/** An item the extension read from a store's registry page. */
export interface StoreItem {
  /** The item's registry link, exactly as the store's page had it. */
  url: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  quantity: number;
}

/** A session that belongs to the extension alone, separate from the site's. */
export interface ExtensionSession {
  access_token: string;
  refresh_token: string;
  /** Seconds since the epoch. */
  expires_at: number;
}

export interface ExtensionRegistry {
  id: string;
  title: string;
  /** The owner's linked store registries, from Settings. */
  storeRegistries: RetailerRegistry[];
  /** In the registry's own order. */
  categories: { id: string; name: string }[];
  /**
   * How many items have a plain link at each store where the owner has a
   * registry. Opening that store's registry swaps in the registry links.
   * Missing from older servers.
   */
  plainLinks?: Partial<Record<StoreId, number>>;
}

export interface MeResponse {
  user: { name: string; email: string | null };
  registries: ExtensionRegistry[];
}

export interface CheckRequest {
  registryId: string;
  urls: string[];
}

export interface CheckResponse {
  /** itemMatchKey values that are already on the registry. */
  existing: string[];
  /**
   * The ones among `existing` that are on the registry with a plain store
   * link, so a registry link can replace it. Missing from older servers.
   */
  plain?: string[];
}

export interface LinkRequest {
  registryId: string;
  /** Items read from a store registry page, each with its registry link. */
  items: StoreItem[];
}

export interface LinkResponse {
  /** Items on the registry whose plain store link now is a registry link. */
  linked: { id: string; title: string; key: string }[];
}

/**
 * Which items on a registry get a registry link in place of their plain one:
 * a plain product link at the same store, for the same product. A registry
 * link that's already there, even one from another store registry, stays.
 */
export function planLinkSwaps(
  existing: { id: string; title: string; external_url: string | null }[],
  incoming: { url: string }[]
): { id: string; title: string; key: string; from: string; to: string }[] {
  const registryLinks = new Map<string, string>();
  for (const item of incoming) {
    const key = storeItemKey(item.url);
    if (key && classifyStoreLink(item.url)?.kind === "registry" && !registryLinks.has(key)) {
      registryLinks.set(key, item.url);
    }
  }
  const swaps: { id: string; title: string; key: string; from: string; to: string }[] = [];
  for (const row of existing) {
    if (!row.external_url || classifyStoreLink(row.external_url)?.kind !== "plain") continue;
    const key = storeItemKey(row.external_url);
    const to = key ? registryLinks.get(key) : undefined;
    if (key && to) swaps.push({ id: row.id, title: row.title, key, from: row.external_url, to });
  }
  return swaps;
}

/** An item added from a product page, with the add-item dialog's fields. */
export interface ProductItem extends StoreItem {
  categoryId: string | null;
  /** "Most wanted" on the site. */
  isEssential: boolean;
  isOpenToUsed: boolean;
  minimumCondition: UsedCondition | null;
  notes: string | null;
}

export interface AddProductRequest {
  registryId: string;
  item: ProductItem;
}

export type AddProductResponse =
  | { added: { id: string; title: string } }
  | { duplicate: { id: string; title: string } };

/** The lowest used condition an owner will accept, as the add-item dialog offers them. */
export const USED_CONDITIONS = [
  { id: "like-new", label: "Like new" },
  { id: "very-good", label: "Very good" },
  { id: "good", label: "Good" },
  { id: "acceptable", label: "Acceptable" },
] as const;

export type UsedCondition = (typeof USED_CONDITIONS)[number]["id"];

/**
 * How the extension decides two links are the same item. At a store we know,
 * it's the product ID, so a registry link and a plain link match. Anywhere
 * else it's the address without its #fragment.
 */
export function itemMatchKey(raw: string | null | undefined): string | null {
  const key = storeItemKey(raw);
  if (key) return key;
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `url:${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return null;
  }
}

export interface AddRequest {
  registryId: string;
  items: StoreItem[];
}

export interface AddResponse {
  added: { id: string; title: string; key: string }[];
  /** Items left out because they're already on the registry. */
  skipped: number;
}

export interface UndoRequest {
  registryId: string;
  itemIds: string[];
}

export interface UndoResponse {
  removed: number;
}

export const MAX_ITEMS_PER_REQUEST = 200;
const MAX_TITLE_LENGTH = 300;
const MAX_URL_LENGTH = 2000;
const MAX_PRICE = 100_000;
const MAX_QUANTITY = 99;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function httpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Checks an item that came from the extension. Only registry item links at
 * stores we know count: the whole point is keeping the store's registry
 * tracking in the link. Returns null for anything else.
 */
export function parseStoreItem(
  raw: unknown
): (StoreItem & { store: StoreId; key: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  if (typeof value.url !== "string" || value.url.length > MAX_URL_LENGTH) return null;
  const link = classifyStoreLink(value.url);
  const key = storeItemKey(value.url);
  if (!link || link.kind !== "registry" || !key) return null;
  // Keep the link as the store wrote it: the query string carries the registry tracking.
  const url = value.url.trim();

  const title =
    typeof value.title === "string" ? value.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (!title) return null;

  const price =
    typeof value.price === "number" && Number.isFinite(value.price) && value.price >= 0 && value.price <= MAX_PRICE
      ? Math.round(value.price * 100) / 100
      : null;

  const quantity =
    typeof value.quantity === "number" && Number.isInteger(value.quantity)
      ? Math.min(Math.max(value.quantity, 1), MAX_QUANTITY)
      : 1;

  return {
    url,
    title,
    price,
    imageUrl: httpsUrl(value.imageUrl),
    quantity,
    store: link.store.id,
    key,
  };
}

const MAX_NOTES_LENGTH = 1000;

/**
 * Checks an item added from a product page. Unlike a registry import, any
 * shop's product page is fine; the link is kept exactly as the page had it,
 * so a registry link stays a registry link. Returns null when it's unusable.
 */
export function parseProductItem(raw: unknown): (ProductItem & { key: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  if (typeof value.url !== "string" || value.url.length > MAX_URL_LENGTH) return null;
  let url: string;
  try {
    const parsed = new URL(value.url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    url = value.url.trim();
  } catch {
    return null;
  }
  const key = itemMatchKey(url);
  if (!key) return null;

  const title =
    typeof value.title === "string" ? value.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (!title) return null;

  const price =
    typeof value.price === "number" && Number.isFinite(value.price) && value.price >= 0 && value.price <= MAX_PRICE
      ? Math.round(value.price * 100) / 100
      : null;
  const quantity =
    typeof value.quantity === "number" && Number.isInteger(value.quantity)
      ? Math.min(Math.max(value.quantity, 1), MAX_QUANTITY)
      : 1;
  const isOpenToUsed = value.isOpenToUsed === true;
  const condition = USED_CONDITIONS.find((c) => c.id === value.minimumCondition)?.id ?? null;
  const notes =
    typeof value.notes === "string" && value.notes.trim() ? value.notes.trim().slice(0, MAX_NOTES_LENGTH) : null;

  return {
    url,
    title,
    price,
    imageUrl: httpsUrl(value.imageUrl),
    quantity,
    categoryId: isUuid(value.categoryId) ? value.categoryId : null,
    isEssential: value.isEssential === true,
    isOpenToUsed,
    // Like the add-item dialog: "like new" unless the owner picked another.
    minimumCondition: isOpenToUsed ? (condition ?? "like-new") : null,
    notes,
    key,
  };
}

// ── Connect page ↔ extension ────────────────────────────────────────────
// The Connect page on regibee.com talks to the extension's content script
// with window.postMessage. Both sides check the message came from the page's
// own window and origin.

export const PAGE_SOURCE = "regibee-page";
export const EXTENSION_SOURCE = "regibee-extension";

export type PageMessage =
  | { source: typeof PAGE_SOURCE; type: "hello" }
  | { source: typeof PAGE_SOURCE; type: "connect"; session: ExtensionSession }
  | { source: typeof PAGE_SOURCE; type: "cancel" };

export type ExtensionMessage =
  | { source: typeof EXTENSION_SOURCE; type: "ready"; version: string }
  | { source: typeof EXTENSION_SOURCE; type: "connected" }
  | { source: typeof EXTENSION_SOURCE; type: "connect-failed"; error: string };

export function isExtensionMessage(data: unknown): data is ExtensionMessage {
  return Boolean(
    data && typeof data === "object" && (data as { source?: unknown }).source === EXTENSION_SOURCE
  );
}

export function isPageMessage(data: unknown): data is PageMessage {
  return Boolean(
    data && typeof data === "object" && (data as { source?: unknown }).source === PAGE_SOURCE
  );
}

/** The page on regibee.com that connects the extension. */
export const CONNECT_PATH = "/extension/connect";
