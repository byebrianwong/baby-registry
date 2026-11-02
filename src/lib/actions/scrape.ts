"use server";

import * as cheerio from "cheerio";

interface ScrapeResult {
  title?: string;
  imageUrl?: string;
  imageUrls?: string[];
  price?: string;
  error?: string;
}

function resolveUrl(raw: string, origin: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return undefined;
  }
}

function pushImage(list: string[], seen: Set<string>, raw: string | undefined, origin: string) {
  if (!raw) return;
  const resolved = resolveUrl(raw, origin);
  if (!resolved) return;
  // Skip tiny tracking pixels and SVG icons
  if (/\.svg(?:$|\?)/i.test(resolved)) return;
  if (seen.has(resolved)) return;
  seen.add(resolved);
  list.push(resolved);
}

// Generic site titles that indicate bot protection or empty pages
const GENERIC_TITLES = new Set([
  "amazon.com",
  "walmart.com",
  "target",
  "ebay",
  "robot check",
  "access denied",
  "just a moment...",
  "attention required",
  "page not found",
  "404",
]);

function isGenericTitle(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return GENERIC_TITLES.has(lower) || lower.length < 3;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function scrapeProductUrl(url: string): Promise<ScrapeResult> {
  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) {
      return { error: "URL must start with http:// or https://" };
    }
  } catch {
    return { error: "Invalid URL format" };
  }

  // Fetch the page HTML
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    console.log(`[scrape] Fetching: ${parsedUrl.toString()}`);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Sec-Ch-Ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    console.log(`[scrape] Response: ${response.status} ${response.statusText}`);
    console.log(`[scrape] Response URL (after redirects): ${response.url}`);
    console.log(`[scrape] Content-Type: ${response.headers.get("content-type")}`);

    if (!response.ok) {
      const body = await response.text();
      console.log(`[scrape] Error body (first 500 chars): ${body.substring(0, 500)}`);
      return { error: `Failed to fetch page (${response.status})` };
    }

    html = await response.text();
    console.log(`[scrape] HTML length: ${html.length} chars`);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { error: "Request timed out" };
    }
    return { error: "Failed to fetch page" };
  }

  // Detect bot protection / minimal pages
  if (html.length < 10000) {
    const lower = html.toLowerCase();
    if (
      lower.includes("captcha") ||
      lower.includes("robot") ||
      lower.includes("blocked") ||
      lower.includes("access denied") ||
      lower.includes("challenge-running")
    ) {
      return {
        error:
          "This site blocked automatic fetching. Please enter the item details manually.",
      };
    }
  }

  // Parse with cheerio
  const $ = cheerio.load(html);

  // Extract title (priority order)
  const rawTitle =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    $('meta[name="twitter:title"]').attr("content")?.trim() ||
    undefined;

  // Decode HTML entities and filter out generic/useless titles
  const decodedTitle = rawTitle ? decodeHtmlEntities(rawTitle) : undefined;
  const title =
    decodedTitle && !isGenericTitle(decodedTitle) ? decodedTitle : undefined;

  // Collect candidate images in priority order (deduped, absolute URLs)
  const imageCandidates: string[] = [];
  const seenImages = new Set<string>();
  const origin = parsedUrl.origin;

  // Open Graph + Twitter card meta tags (highest-signal product images)
  $('meta[property="og:image"]').each((_, el) => {
    pushImage(imageCandidates, seenImages, $(el).attr("content"), origin);
  });
  $('meta[property="og:image:secure_url"]').each((_, el) => {
    pushImage(imageCandidates, seenImages, $(el).attr("content"), origin);
  });
  $('meta[property="og:image:url"]').each((_, el) => {
    pushImage(imageCandidates, seenImages, $(el).attr("content"), origin);
  });
  $('meta[name="twitter:image"]').each((_, el) => {
    pushImage(imageCandidates, seenImages, $(el).attr("content"), origin);
  });
  $('meta[name="twitter:image:src"]').each((_, el) => {
    pushImage(imageCandidates, seenImages, $(el).attr("content"), origin);
  });
  pushImage(
    imageCandidates,
    seenImages,
    $('link[rel="image_src"]').attr("href"),
    origin
  );
  $('[itemprop="image"]').each((_, el) => {
    const node = $(el);
    pushImage(imageCandidates, seenImages, node.attr("content"), origin);
    pushImage(imageCandidates, seenImages, node.attr("src"), origin);
    pushImage(imageCandidates, seenImages, node.attr("href"), origin);
  });

  // Extract price (priority order)
  let price: string | undefined;

  // 1. Try JSON-LD structured data (for both price and additional images)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const nodes = Array.isArray(data) ? data : [data];
      for (const item of nodes) {
        const product =
          item["@type"] === "Product"
            ? item
            : item["@graph"]?.find(
                (g: Record<string, string>) => g["@type"] === "Product"
              );
        if (!product) continue;

        // Collect product images (can be string, array of strings, or ImageObject)
        const img = product.image;
        const addImg = (v: unknown) => {
          if (typeof v === "string") {
            pushImage(imageCandidates, seenImages, v, origin);
          } else if (v && typeof v === "object") {
            const url = (v as { url?: string; contentUrl?: string }).url
              ?? (v as { url?: string; contentUrl?: string }).contentUrl;
            if (url) pushImage(imageCandidates, seenImages, url, origin);
          }
        };
        if (Array.isArray(img)) img.forEach(addImg);
        else addImg(img);

        if (!price && product.offers) {
          const offers = Array.isArray(product.offers)
            ? product.offers[0]
            : product.offers;
          const p =
            offers?.price ?? offers?.lowPrice ?? offers?.highPrice;
          if (p != null) {
            price = String(p);
          }
        }
      }
    } catch {
      // Ignore invalid JSON-LD
    }
  });

  // 2. Try Open Graph / meta tag price
  if (!price) {
    price =
      $('meta[property="og:price:amount"]').attr("content")?.trim() ||
      $('meta[property="product:price:amount"]').attr("content")?.trim() ||
      $('meta[name="price"]').attr("content")?.trim() ||
      $('meta[property="product:price"]').attr("content")?.trim() ||
      undefined;
  }

  // 3. Try common price selectors in page content
  if (!price) {
    const priceSelectors = [
      '[data-test-id="product-pricing-list-sale-range-amount"]',
      '[data-test-id*="price"] [data-test-id*="amount"]',
      '[data-automation-id="product-price"] .price-characteristic',
      '.product-price .price',
      '[itemprop="price"]',
      '.price-sales .price-amount',
    ];
    for (const selector of priceSelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        price = text;
        break;
      }
      const content = $(selector).first().attr("content")?.trim();
      if (content) {
        price = content;
        break;
      }
    }
  }

  // Clean up price — remove currency symbols, commas
  if (price) {
    price = price.replace(/[^0-9.]/g, "");
    // Validate it's a reasonable number
    const num = parseFloat(price);
    if (isNaN(num) || num <= 0) {
      price = undefined;
    } else {
      price = num.toFixed(2);
    }
  }

  // 4. Fallback: scan raw HTML for embedded JSON patterns ecommerce sites use
  //    (e.g. Target's __TGT_DATA__ `alternate_images`, Amazon's `hiRes`, Shopify media)
  const isLikelyImage = (u: string) => {
    if (/\.(jpe?g|png|webp|gif|avif)(\?|$|#)/i.test(u)) return true;
    if (/scene7\.com\/is\/image\//i.test(u)) return true;
    if (/images-(?:na|eu|cn|fe)\.ssl-images-amazon\.com/i.test(u)) return true;
    if (/m\.media-amazon\.com\/images\//i.test(u)) return true;
    if (/i\d*\.walmartimages\.com/i.test(u)) return true;
    if (/cdn\.shopify\.com\/.*\/(?:products|files)\//i.test(u)) return true;
    return false;
  };

  // Target / Shopify / generic galleries: `"alternate_images|additional_images|images|media_gallery": [...]`
  const galleryKeyRegex =
    /"(?:alternate_images|additional_images|media_gallery|gallery_images|image_gallery|images)"\s*:\s*(\[[\s\S]*?\])/g;
  let gm: RegExpExecArray | null;
  let galleriesScanned = 0;
  while ((gm = galleryKeyRegex.exec(html)) && galleriesScanned < 5) {
    galleriesScanned++;
    const arr = gm[1];
    const urlInObjectRegex =
      /"(?:url|src|contentUrl|href|hiRes|large|image|image_url|imageUrl)"\s*:\s*"([^"]+)"/g;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlInObjectRegex.exec(arr))) {
      const u = urlMatch[1];
      if (isLikelyImage(u)) pushImage(imageCandidates, seenImages, u, origin);
    }
    const plainStringRegex = /"(https?:\/\/[^"\s]+?)"/g;
    let strMatch: RegExpExecArray | null;
    while ((strMatch = plainStringRegex.exec(arr))) {
      const u = strMatch[1];
      if (isLikelyImage(u)) pushImage(imageCandidates, seenImages, u, origin);
    }
  }

  // Single-value primary image keys scattered through embedded JSON
  const primaryKeyRegex =
    /"(?:primary_image_url|primaryImageUrl|hero_image|heroImage|hiRes|mainImage|main_image_url)"\s*:\s*"([^"]+)"/g;
  let pm: RegExpExecArray | null;
  while ((pm = primaryKeyRegex.exec(html))) {
    if (isLikelyImage(pm[1])) {
      pushImage(imageCandidates, seenImages, pm[1], origin);
    }
  }

  // Amazon-style data-a-dynamic-image="{\"url1\":[w,h],...}" (keys are URLs)
  const amazonDynRegex = /data-a-dynamic-image\s*=\s*["']([^"']+)["']/g;
  let am: RegExpExecArray | null;
  while ((am = amazonDynRegex.exec(html))) {
    try {
      const decoded = am[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
      const obj = JSON.parse(decoded);
      for (const u of Object.keys(obj)) {
        if (isLikelyImage(u)) pushImage(imageCandidates, seenImages, u, origin);
      }
    } catch {
      // ignore
    }
  }

  // Cap to a reasonable number so the picker doesn't become unmanageable
  const MAX_CANDIDATES = 12;
  if (imageCandidates.length > MAX_CANDIDATES) {
    imageCandidates.length = MAX_CANDIDATES;
  }

  const primaryImageUrl = imageCandidates[0];

  // If we got nothing useful, return a helpful error
  if (!title && !primaryImageUrl && !price) {
    return {
      error:
        "Couldn't extract product details from this page. The site may block automated access. Please enter the details manually.",
    };
  }

  return {
    title: title || undefined,
    imageUrl: primaryImageUrl,
    imageUrls: imageCandidates.length > 0 ? imageCandidates : undefined,
    price: price || undefined,
  };
}
