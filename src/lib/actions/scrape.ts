"use server";

import * as cheerio from "cheerio";

interface ScrapeResult {
  title?: string;
  imageUrl?: string;
  price?: string;
  error?: string;
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

  // Extract image (priority order)
  const imageUrl =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('meta[name="twitter:image"]').attr("content")?.trim() ||
    $('meta[property="og:image:url"]').attr("content")?.trim() ||
    undefined;

  // Extract price (priority order)
  let price: string | undefined;

  // 1. Try JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    if (price) return;
    try {
      const data = JSON.parse($(el).text());
      const products = Array.isArray(data) ? data : [data];
      for (const item of products) {
        const product =
          item["@type"] === "Product"
            ? item
            : item["@graph"]?.find(
                (g: Record<string, string>) => g["@type"] === "Product"
              );
        if (product?.offers) {
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

  // Resolve relative image URLs
  let resolvedImageUrl = imageUrl;
  if (resolvedImageUrl && !resolvedImageUrl.startsWith("http")) {
    try {
      resolvedImageUrl = new URL(resolvedImageUrl, parsedUrl.origin).toString();
    } catch {
      resolvedImageUrl = undefined;
    }
  }

  // If we got nothing useful, return a helpful error
  if (!title && !resolvedImageUrl && !price) {
    return {
      error:
        "Couldn't extract product details from this page. The site may block automated access. Please enter the details manually.",
    };
  }

  return {
    title: title || undefined,
    imageUrl: resolvedImageUrl || undefined,
    price: price || undefined,
  };
}
