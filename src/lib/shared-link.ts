// Finds the product link, and the product's name when there is one, in what a
// phone hands the site: the share sheet's title, text and url (see /share and
// the manifest's share_target), or text pasted from the clipboard.
//
// Store apps share a sentence, not only a link. Amazon's is the product name
// followed by an a.co short link, sometimes after "Check out this product on
// Amazon:". Android puts that sentence in `text` and often leaves `url` empty.
// A browser shares the page title and the page's link.

export interface SharedLink {
  /** The product link. */
  url: string;
  /** The product's name, when the shared text had one besides the link. */
  title?: string;
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'“”]+/i;
const URL_IN_TEXT_GLOBAL = /https?:\/\/[^\s<>"'“”]+/gi;

/** Phrases that come before the product name in a store app's share text. */
const LEAD_INS = [
  /^check (?:out|this out)[^:]*:\s*/i,
  /^(?:i )?found (?:this|it) on [^:]*:\s*/i,
  /^(?:look|see) what i found[^:]*:\s*/i,
  /^shop [^:]*:\s*/i,
];

/** Store names that page titles end with, like "Car Seat | Target". */
const TITLE_SUFFIX =
  /\s*[|:–—-]\s*(?:amazon(?:\.com)?|target|walmart(?:\.com)?|etsy|pottery barn kids|babylist|ebay)\s*$/i;

/** A domain that page titles start with, like "Amazon.com: Car Seat". */
const TITLE_DOMAIN_PREFIX = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|co\.uk|ca|co|net|org)\s*:\s*/i;

/** The link without trailing sentence punctuation, or null when it isn't a web link. */
function cleanUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/[.,;:!?)\]}>'"’”]+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function firstUrlIn(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(URL_IN_TEXT);
  return match ? cleanUrl(match[0]) : null;
}

/** A product name from shared text, without the link, lead-ins or store names. */
function cleanTitle(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  let title = raw.replace(URL_IN_TEXT_GLOBAL, " ").replace(/\s+/g, " ").trim();
  for (const leadIn of LEAD_INS) title = title.replace(leadIn, "");
  // Amazon page titles: "Amazon.com : Graco 4Ever DLX Car Seat : Baby". The
  // part after the last colon is the department.
  if (/^amazon\.[a-z.]+\s*:/i.test(title)) {
    title = title.replace(TITLE_DOMAIN_PREFIX, "").replace(/\s+:\s+[^:]{1,40}$/, "");
  }
  title = title.replace(TITLE_DOMAIN_PREFIX, "").replace(TITLE_SUFFIX, "");
  title = title
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/[\s:|–—-]+$/, "")
    .trim();
  // A store or site name alone isn't a product name.
  if (title.length < 3 || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(title)) return undefined;
  return title.slice(0, 200);
}

/**
 * The product link and name in what was shared or pasted, or null when there's
 * no link. Takes the share sheet's three fields; for pasted text pass `text`.
 */
export function findSharedLink(shared: {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}): SharedLink | null {
  const url = cleanUrl(shared.url) ?? firstUrlIn(shared.text) ?? firstUrlIn(shared.title);
  if (!url) return null;
  // A browser's title is the page title. A store app's text is "name link".
  const title = cleanTitle(shared.title) ?? cleanTitle(shared.text);
  return title ? { url, title } : { url };
}

/**
 * A rough product name from the words in a product link's path, for when the
 * page itself can't be read. Amazon links often carry one
 * (/Graco-4Ever-DLX-Car-Seat/dp/B07...), as do Target (/p/<name>/-/A-123),
 * Walmart (/ip/<name>/123) and Etsy (/listing/123/<name>). Short links such
 * as a.co don't, so this returns undefined for them.
 */
export function nameFromProductUrl(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  const segments = url.pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .filter(Boolean);
  // The segment with the most words wins. A name has at least three words,
  // mostly letters, so ids such as B07PMK8R2V or A-12345 don't count.
  let best: string[] = [];
  for (const segment of segments) {
    if (!/[-_+]/.test(segment)) continue;
    const words = segment
      .replace(/\.(?:html?|php|aspx?)$/i, "")
      .split(/[-_+]+/)
      .filter(Boolean);
    const wordy = words.filter((word) => /[a-z]{2,}/i.test(word));
    if (words.length >= 3 && wordy.length >= 2 && wordy.length / words.length >= 0.5 && words.length > best.length) {
      best = words;
    }
  }
  if (best.length === 0) return undefined;
  const name = best.join(" ");
  return (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, 200);
}
