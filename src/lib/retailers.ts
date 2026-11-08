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

export type StoreId = "amazon" | "target" | "walmart" | "potterybarnkids" | "babylist";

/**
 * How to tell a registry item link from a plain product link at one store.
 * The patterns come from real links: the 51 store links saved on a real
 * Regibee registry, plus the item links on the stores' own registry pages.
 */
interface LinkRules {
  /** Query params that must all be present for a registry item link. Matched ignoring case. */
  registryParams: string[];
  /** The store's product page paths. A product link without the registry params is a plain link. */
  productPath: RegExp;
  /** Hosts where product links follow these rules. Short-link hosts (a.co, amzn.to) aren't listed, because they hide the real link. */
  hosts: string[];
  /**
   * Captures the store's product ID from a product link's path, so a
   * registry link and a plain link to the same product count as one item.
   */
  productId: RegExp;
}

/**
 * Where the browser extension reads the owner's registry items on the
 * store's own site. It reads only pages whose path matches.
 */
interface RegistryPage {
  path: RegExp;
  /** The page the extension's "Open" link goes to. */
  openUrl: string;
  /** False until someone has checked that the extension can read this store's page. */
  verified: boolean;
}

export interface StoreInfo {
  id: StoreId;
  name: string;
  /** Shown in copy, e.g. "Open your registry on target.com". */
  domain: string;
  /** Hostnames that belong to the store. Subdomains match too. */
  hosts: string[];
  /** Missing when we don't know the store's registry link format yet: its links are always "unknown". */
  links?: LinkRules;
  /** The copy-link step that says which page to copy from, when it matters. */
  openRegistryStep?: string;
  /** Missing when the extension can't read this store's registry yet. Needs `links` too. */
  registryPage?: RegistryPage;
}

export const STORES: StoreInfo[] = [
  {
    id: "amazon",
    name: "Amazon",
    domain: "amazon.com",
    hosts: ["amazon.com", "a.co", "amzn.to"],
    // Registry item links are /dp/<ASIN> links (sometimes /<slug>/dp/<ASIN>)
    // with colid and coliid, often with sbo, psc, th and others too. Every
    // item on the owner's "Your registry" page (/baby-reg/your-registry/...)
    // links this way. sbo alone isn't a marker: item links on the registry
    // home page carry sbo without colid.
    links: {
      registryParams: ["colid", "coliid"],
      productPath: /\/(dp|gp\/product)\//i,
      hosts: ["amazon.com"],
      productId: /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?=[/?#]|$)/i,
    },
    openRegistryStep:
      'Open the "Your registry" page on amazon.com, not the registry home page.',
    // Checked on a real registry: /baby-reg/your-registry redirects to the
    // owner's own list, and every item there has its registry link, name,
    // price and image on the page.
    registryPage: {
      path: /^\/baby-reg\/your-registry/i,
      openUrl: "https://www.amazon.com/baby-reg/your-registry",
      verified: true,
    },
  },
  {
    id: "target",
    name: "Target",
    domain: "target.com",
    hosts: ["target.com"],
    // Registry item links are /p/<slug>/-/A-<tcin> with registryId and
    // itemLineNum, plus regMode, pageFrom, lnk and others. They come from the
    // owner's view, /gift-registry/my-registry.
    links: {
      registryParams: ["registryId"],
      productPath: /^\/p\//i,
      hosts: ["target.com"],
      productId: /\/A-(\d+)(?=[/?#]|$)/i,
    },
    openRegistryStep:
      "Open your own registry view at target.com/gift-registry/my-registry, not the guest view.",
    // UNVERIFIED: the owner view needed a fresh sign-in, so nobody has read
    // it yet. The guest view (/gift-registry/gift-giver) has no item links at
    // all, so the extension can't read that one.
    registryPage: {
      path: /^\/gift-registry\//i,
      openUrl: "https://www.target.com/gift-registry/my-registry",
      verified: false,
    },
  },
  {
    id: "walmart",
    name: "Walmart",
    domain: "walmart.com",
    hosts: ["walmart.com"],
    // Registry item links are /ip/seort/<id> with listRegistryId and
    // listRegistryType=BR. Every item on the registry page
    // (/registry/BR/<id>) links this way.
    links: {
      registryParams: ["listRegistryId"],
      productPath: /^\/ip\//i,
      hosts: ["walmart.com"],
      productId: /^\/ip\/(?:[^/?#]+\/)?(\d+)(?=[/?#]|$)/i,
    },
    // Checked on a real registry: the registry page lists every item with its
    // registry link, even without signing in.
    registryPage: {
      path: /^\/registry\//i,
      openUrl: "https://www.walmart.com/registry",
      verified: true,
    },
  },
  {
    id: "potterybarnkids",
    name: "Pottery Barn Kids",
    domain: "potterybarnkids.com",
    hosts: ["potterybarnkids.com"],
    // Registry item links are /products/<id>/ with wlid and wlitemid, plus
    // fromrgl and atrelev.
    links: {
      registryParams: ["wlid", "wlitemid"],
      productPath: /^\/products\//i,
      hosts: ["potterybarnkids.com"],
      productId: /^\/products\/([^/?#]+)/i,
    },
    // UNVERIFIED: nobody has opened a Pottery Barn Kids registry page yet, so
    // both the path and the page to open are best guesses.
    registryPage: {
      path: /\/registry\//i,
      openUrl: "https://www.potterybarnkids.com/registry/",
      verified: false,
    },
  },
  {
    id: "babylist",
    name: "Babylist",
    domain: "babylist.com",
    hosts: ["babylist.com"],
    // UNVERIFIED: the only sample is a Babylist Shop product page
    // (/gp/<slug>/<num>/<num>, no query string). We don't know what a
    // Babylist registry item link looks like, so its links stay "unknown".
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

/**
 * - "registry": a registry item link, so gifts bought through it count toward
 *   the owner's store registry.
 * - "plain": a store product page link without the registry params.
 * - "unknown": anything else, such as short links, registry pages, or stores
 *   whose registry links we haven't seen. Treat it neutrally.
 */
export type StoreLinkKind = "registry" | "plain" | "unknown";

export function classifyStoreLink(
  raw: string | null | undefined
): { store: StoreInfo; kind: StoreLinkKind } | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const store = detectStore(url.toString());
  if (!store) return null;
  const rules = store.links;
  if (!rules) return { store, kind: "unknown" };

  // Only product page links count either way. A registry page link (say
  // /gift-registry/gift-giver?registryId=...) also carries the registry
  // params, but it isn't an item.
  const hostname = url.hostname.toLowerCase();
  const isProductLink =
    rules.hosts.some((h) => hostMatches(hostname, h)) && rules.productPath.test(url.pathname);
  if (!isProductLink) return { store, kind: "unknown" };

  const params = new Set([...url.searchParams.keys()].map((k) => k.toLowerCase()));
  const hasRegistryParams = rules.registryParams.every((p) => params.has(p.toLowerCase()));
  return { store, kind: hasRegistryParams ? "registry" : "plain" };
}

/**
 * The store whose registry a gift bought through this link counts toward, or
 * null. A registry item link counts on its own. A link we can't classify, such
 * as a short link, counts only if the owner linked that store.
 */
export function registryStoreFor(
  raw: string | null | undefined,
  linkedStores: StoreId[]
): StoreInfo | null {
  const result = classifyStoreLink(raw);
  if (!result) return null;
  if (result.kind === "registry") return result.store;
  if (result.kind === "unknown" && linkedStores.includes(result.store.id)) return result.store;
  return null;
}

/**
 * "<store>:<product ID>" for a product link at a store whose links we know,
 * e.g. "amazon:B0EXAMPLE1". A registry link and a plain link to the same
 * product get the same key. Null for anything else, including short links.
 */
export function storeItemKey(raw: string | null | undefined): string | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const store = detectStore(url.toString());
  const rules = store?.links;
  if (!store || !rules) return null;
  const hostname = url.hostname.toLowerCase();
  if (!rules.hosts.some((h) => hostMatches(hostname, h))) return null;
  const match = url.pathname.match(rules.productId);
  if (!match?.[1]) return null;
  // Amazon product IDs are uppercase; the others are digits or lowercase slugs.
  const id = store.id === "amazon" ? match[1].toUpperCase() : match[1].toLowerCase();
  return `${store.id}:${id}`;
}

/** Stores the browser extension can read registries from. */
export const EXTENSION_STORES: StoreInfo[] = STORES.filter((s) => s.links && s.registryPage);

/** The store whose registry page this is, if the extension can read it. */
export function extensionStoreForPage(raw: string | null | undefined): StoreInfo | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const store = detectStore(url.toString());
  if (!store?.links || !store.registryPage) return null;
  return store.registryPage.path.test(url.pathname) ? store : null;
}

/** Stores that at least one of these links is a registry item link for. */
export function storesWithRegistryLinks(urls: (string | null | undefined)[]): StoreId[] {
  const found = new Set<StoreId>();
  for (const url of urls) {
    const result = classifyStoreLink(url);
    if (result?.kind === "registry") found.add(result.store.id);
  }
  return STORES.filter((s) => found.has(s.id)).map((s) => s.id);
}

/** Steps for copying an item's registry link from the store's registry page. */
export function copyLinkSteps(store: StoreInfo): string[] {
  return [
    `Add the item to your ${store.name} registry.`,
    store.openRegistryStep ?? `Open your registry on ${store.domain}.`,
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
