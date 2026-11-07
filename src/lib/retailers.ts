// Stores where owners can make their own registry, and how to recognise a
// link from one. Everything store-specific lives in this file so it's easy to
// update when a store changes its links or perks.
//
// Why it matters: when a guest buys through the link an owner copied from
// their store registry, the store counts the gift toward that registry, and
// the owner keeps perks like completion discounts and welcome boxes. A plain
// product link doesn't carry that.
//
// Never rewrite or strip the query string of an item link. That's where the
// store keeps its registry tracking.

export type StoreId = "amazon" | "target" | "walmart" | "babylist";

export interface StoreInfo {
  id: StoreId;
  name: string;
  /** Shown in copy, e.g. "Open your registry on target.com". */
  domain: string;
  /** Hostnames that belong to the store. Subdomains match too. */
  hosts: string[];
  /**
   * Hostnames where a product link with no query string and no fragment is
   * treated as a plain link: with nothing after the path, it has nowhere to
   * carry registry tracking. Short-link hosts (a.co, amzn.to) aren't listed,
   * because they hide the real link.
   */
  plainWhenBareOn: string[];
}

export const STORES: StoreInfo[] = [
  {
    id: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    hosts: ["amazon.com", "a.co", "amzn.to"],
    plainWhenBareOn: ["amazon.com"],
  },
  {
    id: "target",
    name: "Target",
    domain: "target.com",
    hosts: ["target.com"],
    plainWhenBareOn: ["target.com"],
  },
  {
    id: "walmart",
    name: "Walmart",
    domain: "walmart.com",
    hosts: ["walmart.com"],
    plainWhenBareOn: ["walmart.com"],
  },
  {
    id: "babylist",
    name: "Babylist",
    domain: "babylist.com",
    hosts: ["babylist.com"],
    // Babylist links often point at other stores, so a bare link tells us
    // nothing either way.
    plainWhenBareOn: [],
  },
];

const STORE_IDS = new Set<string>(STORES.map((s) => s.id));

export function isStoreId(value: unknown): value is StoreId {
  return typeof value === "string" && STORE_IDS.has(value);
}

export function getStore(id: StoreId): StoreInfo {
  return STORES.find((s) => s.id === id)!;
}

function parseUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`);
}

/** The store a link belongs to, or null for any other site. */
export function detectStore(raw: string | null | undefined): StoreInfo | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase();
  return STORES.find((s) => s.hosts.some((h) => hostMatches(hostname, h))) ?? null;
}

/** True when the link is on the given store's site. Used to check registry links in settings. */
export function isLinkForStore(raw: string, storeId: StoreId): boolean {
  return detectStore(raw)?.id === storeId;
}

// UNVERIFIED: these markers are a best guess at how a link copied from a store
// registry identifies that registry. No store documents its registry item
// links, and none has been checked against a real copied link yet. A match is
// a strong hint (a plain product link wouldn't name a registry or a list
// item), so false positives should be rare. Replace these with each store's
// real pattern once we have sample links.
const REGISTRY_QUERY_KEYS = new Set([
  "registryid",
  "registry_id",
  "registry-id",
  "registryitemid",
  "registry_item_id",
  "regid",
  "colid",
  "coliid",
]);
const REGISTRY_PATH = /\/(baby-reg|gift-registry|registry|registries)(\/|$)/i;

/**
 * - "registry": the link names a registry, so gifts bought through it should
 *   count toward the owner's store registry.
 * - "plain": a store product link with nothing after the path, so it can't be
 *   carrying registry tracking.
 * - "unknown": anything else. Treat it neutrally: it may or may not be a
 *   registry link.
 */
export type StoreLinkKind = "registry" | "plain" | "unknown";

export function classifyStoreLink(
  raw: string | null | undefined
): { store: StoreInfo; kind: StoreLinkKind } | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const store = detectStore(url.toString());
  if (!store) return null;

  const hasRegistryKey = [...url.searchParams.keys()].some((k) =>
    REGISTRY_QUERY_KEYS.has(k.toLowerCase())
  );
  if (hasRegistryKey || REGISTRY_PATH.test(url.pathname)) {
    return { store, kind: "registry" };
  }

  const hostname = url.hostname.toLowerCase();
  const bare = url.search === "" && url.hash === "";
  if (bare && store.plainWhenBareOn.some((h) => hostMatches(hostname, h))) {
    return { store, kind: "plain" };
  }

  return { store, kind: "unknown" };
}

/** Steps for copying an item's registry link from the store's registry page. */
export function copyLinkSteps(store: StoreInfo): string[] {
  return [
    `Add the item to your ${store.name} registry.`,
    `Open your registry on ${store.domain}.`,
    "Right-click the item's name and choose Copy Link Address. On a phone, press and hold the name instead.",
    "Paste the link here.",
  ];
}

export interface RetailerRegistry {
  store: StoreId;
  url: string;
}

export const MAX_RETAILER_REGISTRIES = STORES.length;

/**
 * Reads `settings.retailer_registries` defensively, since settings is untyped
 * jsonb. Drops malformed entries and keeps one registry per store.
 */
export function parseRetailerRegistries(settings: unknown): RetailerRegistry[] {
  const raw =
    settings && typeof settings === "object"
      ? (settings as Record<string, unknown>).retailer_registries
      : undefined;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<StoreId>();
  const result: RetailerRegistry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { store, url } = entry as Record<string, unknown>;
    if (!isStoreId(store) || typeof url !== "string" || seen.has(store)) continue;
    seen.add(store);
    result.push({ store, url });
  }
  return result;
}
