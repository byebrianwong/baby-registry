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
  /** storeItemKey values that are already on the registry. */
  existing: string[];
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
