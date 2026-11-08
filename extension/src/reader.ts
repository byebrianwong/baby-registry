// Reads the items on a store's registry page.
//
// One reader works for every store: it looks for links that are registry item
// links by the store's rules in src/lib/retailers.ts, then reads each item's
// name, price and image from the smallest part of the page around its links
// that holds no other item. Stores redesign their pages often; keeping the
// reader tied to the registry links, not to class names, makes it less likely
// to break.

import type { StoreItem } from "@/lib/extension";
import { classifyStoreLink, storeItemKey, type StoreInfo } from "@/lib/retailers";

// How far up from a link to look for the rest of its item.
const MAX_DEPTH = 12;
const PRICE = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/;
// Link text that isn't a product name.
const NOT_A_TITLE = /^(add to cart|add to registry|view|view details|shop|buy|buy now|see (more|details|options)|choose options|\$.*|\d+(\.\d+)?)$/i;

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function textOf(el: Element): string {
  return clean((el as HTMLElement).innerText ?? el.textContent);
}

function parsePrice(text: string): number | null {
  const match = text.match(PRICE);
  if (!match) return null;
  const value = Number(`${match[1].replace(/,/g, "")}.${(match[2] ?? "0").padEnd(2, "0")}`);
  return Number.isFinite(value) ? value : null;
}

function parseQuantity(text: string): number {
  // Walmart's registry page says "0 of 1 purchased": the second number is how many are wanted.
  const ofPurchased = text.match(/(?<!\d)\d{1,2}\s+of\s+(\d{1,2})\s+(?:purchased|bought)\b/i);
  // No \b after the number: inline labels can run together, as in "Requested: 2Purchased: 0".
  const match =
    ofPurchased ??
    text.match(/\b(?:requested|wants?|needs?)\s*:?\s*(\d{1,2})(?!\d)/i) ??
    text.match(/(?<!\d)(\d{1,2})\s+(?:needed|requested|wanted)\b/i);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 99 ? value : 1;
}

function httpsUrl(raw: string | null | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), base);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageSource(img: HTMLImageElement, base: string): string | null {
  const direct = img.currentSrc || img.getAttribute("src");
  if (direct && !direct.startsWith("data:")) return httpsUrl(direct, base);
  // Lazy-loaded images keep the real address elsewhere until they scroll into view.
  const lazy = img.getAttribute("data-src") ?? img.getAttribute("data-lazy-src");
  if (lazy) return httpsUrl(lazy, base);
  const dynamic = img.getAttribute("data-a-dynamic-image");
  if (dynamic) {
    try {
      const first = Object.keys(JSON.parse(dynamic) as Record<string, unknown>)[0];
      if (first) return httpsUrl(first, base);
    } catch {
      // Not JSON; fall through.
    }
  }
  const srcset = img.getAttribute("srcset") ?? img.getAttribute("data-srcset");
  const fromSet = srcset?.split(",")[0]?.trim().split(/\s+/)[0];
  return httpsUrl(fromSet, base);
}

function bestImage(card: Element, base: string): string | null {
  let best: { src: string; area: number } | null = null;
  for (const img of card.querySelectorAll("img")) {
    const src = imageSource(img, base);
    if (!src) continue;
    const rect = img.getBoundingClientRect();
    const area = rect.width * rect.height || img.naturalWidth * img.naturalHeight || 1;
    // Skip icons: badges, stars, logos.
    if (rect.width > 0 && rect.width < 40 && rect.height < 40) continue;
    if (!best || area > best.area) best = { src, area };
  }
  return best?.src ?? null;
}

function bestTitle(links: HTMLAnchorElement[], card: Element): string {
  const candidates: string[] = [];
  for (const a of links) {
    candidates.push(textOf(a), clean(a.getAttribute("aria-label")), clean(a.getAttribute("title")));
    for (const img of a.querySelectorAll("img")) candidates.push(clean(img.getAttribute("alt")));
  }
  for (const img of card.querySelectorAll("img")) candidates.push(clean(img.getAttribute("alt")));
  const usable = candidates.filter((t) => t.length >= 3 && !NOT_A_TITLE.test(t));
  // The longest name is usually the full one; short ones are often cut off.
  usable.sort((a, b) => b.length - a.length);
  return usable[0] ?? "";
}

export function readRegistryItems(root: ParentNode, store: StoreInfo, baseUrl: string): StoreItem[] {
  // Group the page's registry links by product, in page order.
  const linksByKey = new Map<string, HTMLAnchorElement[]>();
  const keyOfLink = new Map<Element, string>();
  for (const a of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    let href: string;
    try {
      href = new URL(a.getAttribute("href")!, baseUrl).toString();
    } catch {
      continue;
    }
    const link = classifyStoreLink(href);
    if (link?.store.id !== store.id || link.kind !== "registry") continue;
    const key = storeItemKey(href);
    if (!key) continue;
    keyOfLink.set(a, key);
    const group = linksByKey.get(key);
    if (group) group.push(a);
    else linksByKey.set(key, [a]);
  }

  const holdsOtherItem = (el: Element, key: string) => {
    for (const a of el.querySelectorAll("a[href]")) {
      const other = keyOfLink.get(a);
      if (other && other !== key) return true;
    }
    return false;
  };

  const items: StoreItem[] = [];
  for (const [key, links] of linksByKey) {
    // Climb from the first link until the next step up would take in another
    // item. Stop early at the first box that has both a picture and a price.
    let card: Element = links[0];
    let complete: Element | null = null;
    let el: Element | null = links[0].parentElement;
    for (let depth = 0; el && depth < MAX_DEPTH; depth++, el = el.parentElement) {
      if (holdsOtherItem(el, key)) break;
      card = el;
      if (el.querySelector("img") && PRICE.test(textOf(el))) {
        complete = el;
        break;
      }
    }
    const box = complete ?? card;
    const text = textOf(box);
    const title = bestTitle(links, box);
    if (!title) continue;

    items.push({
      url: new URL(links[0].getAttribute("href")!, baseUrl).toString(),
      title,
      price: parsePrice(text),
      imageUrl: bestImage(box, baseUrl),
      quantity: parseQuantity(text),
    });
  }
  return items;
}
