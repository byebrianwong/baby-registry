// Turning a shared or pasted link into a product: name, price and pictures.

import { detectStore, storeItemKey } from "@shared/retailers";

/** What the product reader found on a page (extension/src/product-reader.ts). */
export interface ReadProduct {
  url: string;
  title: string;
  price: number | null;
  images: string[];
  isProduct: boolean;
}

const MAX_TITLE_LENGTH = 300;
const MAX_PRICE = 100_000;
const MAX_IMAGES = 12;

function httpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Checks what the reader sent back. Returns null when it's unusable. */
export function parseReadProduct(raw: unknown): ReadProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH) : "";
  const price =
    typeof value.price === "number" && Number.isFinite(value.price) && value.price > 0 && value.price <= MAX_PRICE
      ? Math.round(value.price * 100) / 100
      : null;
  const images = Array.isArray(value.images)
    ? [...new Set(value.images.map(httpsUrl).filter((u): u is string => Boolean(u)))].slice(0, MAX_IMAGES)
    : [];
  const url = typeof value.url === "string" ? value.url : "";
  if (!title && images.length === 0) return null;
  return { url, title, price, images, isProduct: value.isProduct === true };
}

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;

// Words apps put before the product name when they share a link.
const SHARE_PREFIXES = [
  /^check (?:out|this out)(?: this)?(?: [\w\s'-]{0,30})?(?: on| at| from)? [\w.\s-]{0,20}:\s*/i,
  /^(?:i )?found (?:this|it)(?: on| at)? [\w.\s-]{0,20}:\s*/i,
  /^look what i found(?: on| at)? [\w.\s-]{0,20}:\s*/i,
  /^amazon\.com\s*:\s*/i,
  /^target\s*:\s*/i,
];

const SHARE_SUFFIXES = [/\s*[-|:]\s*(?:amazon\.com|target|walmart\.com|walmart)\s*$/i];

/**
 * A link and a name from what another app shared. Apps share a product as
 * text like "Check out this deal on Amazon: Baby monitor https://a.co/d/abc",
 * or just the link.
 */
export function parseSharedText(text: string | null | undefined, extraUrl?: string | null, extraTitle?: string | null) {
  const raw = (text ?? "").trim();
  const urls = raw.match(URL_PATTERN)?.map((u) => u.replace(/[),.;!?]+$/, "")) ?? [];
  const url = httpsUrl(extraUrl) ?? (extraUrl?.startsWith("http") ? extraUrl : null) ?? urls[urls.length - 1] ?? null;

  let title = (extraTitle ?? "").trim();
  if (!title) {
    title = raw.replace(URL_PATTERN, " ").replace(/\s+/g, " ").trim();
    for (const prefix of SHARE_PREFIXES) title = title.replace(prefix, "");
  }
  for (const suffix of SHARE_SUFFIXES) title = title.replace(suffix, "");
  title = title.replace(/^["“]|["”]$/g, "").trim();
  // A share that's only a sentence about the app, or the link again, isn't a name.
  if (title.length < 3 || /^https?:/i.test(title)) title = "";

  return { url, title: title.slice(0, MAX_TITLE_LENGTH) };
}

/** Adds https:// to a link typed without it. Returns null when it isn't a web link. */
export function normalizeLink(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * How two links count as the same item, the same as the website and the
 * extension (itemMatchKey in src/lib/extension.ts): the product ID at a store
 * Regibee knows, otherwise the address without its #fragment.
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

/** "Amazon", "Target", or the site's host name. */
export function storeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const store = detectStore(raw);
  if (store) return store.name;
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
