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

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { error: `Failed to fetch page (${response.status})` };
    }

    html = await response.text();
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

  // Filter out generic/useless titles
  const title = rawTitle && !isGenericTitle(rawTitle) ? rawTitle : undefined;

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
