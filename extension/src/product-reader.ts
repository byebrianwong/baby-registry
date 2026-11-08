// Reads the product on the page the owner is looking at, for the popup's
// "Add to Regibee" form. The popup runs it in the page with
// chrome.scripting.executeScript only after the owner clicks the toolbar
// button, so the extension never reads other pages.
//
// Chrome copies this function into the page by its source text, so it must
// not use anything from outside its own body: no imports, no shared helpers.

export interface ProductPage {
  /** The page's address, exactly as it is, so a store registry link stays one. */
  url: string;
  title: string;
  price: number | null;
  /** Product pictures, best first. */
  images: string[];
  /** False when nothing on the page says it's a product. */
  isProduct: boolean;
}

export function readProductPage(): ProductPage {
  const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
  const decode = (text: string) => {
    const area = document.createElement("textarea");
    area.innerHTML = text;
    return area.value;
  };
  const meta = (...names: string[]) => {
    for (const name of names) {
      const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`);
      const content = clean(el?.getAttribute("content"));
      if (content) return content;
    }
    return null;
  };
  const absolute = (raw: unknown) => {
    if (typeof raw !== "string" || !raw.trim() || raw.startsWith("data:")) return null;
    try {
      const url = new URL(raw.trim(), location.href);
      return url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  };
  const toPrice = (raw: unknown) => {
    if (raw === null || raw === undefined) return null;
    const match = String(raw).replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
    const value = match ? Number(match[0]) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  // Structured data that most shops add for search engines.
  type Json = Record<string, unknown>;
  let product: Json | null = null;
  const visit = (node: unknown) => {
    if (product || !node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const value = node as Json;
    const types = ([] as unknown[]).concat(value["@type"]);
    if (types.some((t) => typeof t === "string" && /^(Product|ProductGroup|IndividualProduct)$/i.test(t))) {
      product = value;
      return;
    }
    visit(value["@graph"]);
  };
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      visit(JSON.parse(script.textContent ?? ""));
    } catch {
      // Some shops ship broken JSON. Skip it.
    }
    if (product) break;
  }
  const ld = product as Json | null;
  const ldImages = (raw: unknown): unknown[] =>
    ([] as unknown[]).concat(raw ?? []).map((i) => (typeof i === "string" ? i : (i as Json)?.url ?? (i as Json)?.contentUrl));
  const ldPrice = (raw: unknown): number | null => {
    for (const offer of ([] as unknown[]).concat(raw ?? [])) {
      const o = offer as Json;
      const price = toPrice(o?.price ?? o?.lowPrice ?? (o?.priceSpecification as Json | undefined)?.price);
      if (price) return price;
    }
    return null;
  };
  const variantOffers = Array.isArray(ld?.hasVariant) ? (ld!.hasVariant as Json[])[0]?.offers : undefined;

  // Amazon, Target and Walmart leave the price and most pictures out of their
  // structured data, so read their product blocks.
  let amazonTitle: string | null = null;
  let storePrice: number | null = null;
  const storeImages: string[] = [];
  if (/(^|\.)target\.com$/i.test(location.hostname)) {
    storePrice = toPrice(document.querySelector('[data-test="product-price"]')?.textContent);
    for (const img of document.querySelectorAll<HTMLImageElement>('[data-test^="image-gallery-item-"] img')) {
      storeImages.push(img.currentSrc || img.src);
    }
  }
  if (/(^|\.)walmart\.com$/i.test(location.hostname)) {
    // Walmart sets picture sizes in the query string; without it you get the full picture.
    for (const img of document.querySelectorAll<HTMLImageElement>('[data-testid="hero-image"] img, [data-testid="media-thumbnail"] img')) {
      const src = img.currentSrc || img.src;
      if (src) storeImages.push(src.split("?")[0]);
    }
  }
  if (/(^|\.)amazon\.com$/i.test(location.hostname)) {
    amazonTitle = clean(document.getElementById("productTitle")?.textContent) || null;
    const priceEl = document.querySelector(
      "#corePrice_feature_div .a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #apex_desktop .a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice"
    );
    storePrice = toPrice(priceEl?.textContent);
    const landing = (document.getElementById("landingImage") ?? document.getElementById("imgBlkFront")) as HTMLImageElement | null;
    if (landing) {
      // data-a-dynamic-image maps each size's address to [width, height]. Take the biggest.
      try {
        const sizes = Object.entries(JSON.parse(landing.getAttribute("data-a-dynamic-image") ?? "{}") as Record<string, [number, number]>);
        sizes.sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1]);
        if (sizes[0]) storeImages.push(sizes[0][0]);
      } catch {
        // Fall back to the other attributes.
      }
      const hires = landing.getAttribute("data-old-hires");
      if (hires) storeImages.push(hires);
      if (landing.currentSrc || landing.src) storeImages.push(landing.currentSrc || landing.src);
    }
    // The thumbnails down the side. Dropping the size code ("._AC_US40_") gives the full picture.
    for (const img of document.querySelectorAll<HTMLImageElement>("#altImages img")) {
      if (img.closest(".videoThumbnail, .videoBlockIngress")) continue;
      const src = img.getAttribute("src") ?? "";
      if (/\/images\/I\//.test(src)) storeImages.push(src.replace(/\._[^/]*_\./, "."));
    }
  }

  const titleFromDocument = clean(document.title)
    .replace(/^amazon\.com\s*:\s*/i, "")
    .replace(/\s*[:|–-]\s*(target|walmart\.com|walmart|amazon\.com)\s*$/i, "");
  const title =
    amazonTitle ||
    (typeof ld?.name === "string" ? clean(decode(ld.name)) : "") ||
    meta("og:title", "twitter:title") ||
    clean(document.querySelector("h1")?.textContent) ||
    titleFromDocument;

  const price =
    storePrice ??
    ldPrice(ld?.offers) ??
    ldPrice(variantOffers) ??
    toPrice(meta("product:price:amount", "og:price:amount", "twitter:data1")) ??
    toPrice(
      document.querySelector('[itemprop="price"]')?.getAttribute("content") ??
        document.querySelector('[itemprop="price"]')?.textContent
    );

  const socialImages = [...document.querySelectorAll('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]')].map(
    (m) => m.getAttribute("content")
  );
  const candidates = [...storeImages, ...ldImages(ld?.image), ...socialImages];
  // A page with no picture data: use its biggest pictures.
  if (candidates.length === 0) {
    const big = [...document.images]
      .filter((img) => img.naturalWidth >= 200 && img.naturalHeight >= 200)
      .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
      .slice(0, 4);
    candidates.push(...big.map((img) => img.currentSrc || img.src));
  }
  const seen = new Set<string>();
  const images: string[] = [];
  for (const raw of candidates) {
    const url = absolute(raw);
    if (!url) continue;
    // The same picture often comes in several sizes: Amazon puts the size in
    // the file name, other shops in the query string. Keep one of each.
    const parsed = new URL(url);
    const id = url.match(/\/images\/I\/([^._/]+)/)?.[1] ?? `${parsed.hostname}${parsed.pathname}`;
    if (seen.has(id)) continue;
    seen.add(id);
    images.push(url);
    if (images.length >= 8) break;
  }

  const isProduct = Boolean(
    amazonTitle ||
      ld ||
      /product/i.test(meta("og:type") ?? "") ||
      meta("product:price:amount", "og:price:amount") ||
      document.querySelector('[itemtype*="schema.org/Product"]')
  );

  return { url: location.href, title: title.slice(0, 300), price, images, isProduct };
}
