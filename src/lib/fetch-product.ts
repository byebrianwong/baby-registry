// Fills in the add and edit item dialogs from a product link. Browser only.
//
// The server fetches most shops' pages fine, but some stores, Amazon above
// all, block it. When the Regibee extension is installed, it can open the
// link in a background tab and read the product there, the same way it does
// when the owner clicks its button on a product page. So at the stores the
// extension reads, ask it first.

import { scrapeProductUrl } from "@/lib/actions/scrape";
import {
  extensionCanReadLink,
  isExtensionMessage,
  PAGE_SOURCE,
  parseReadProduct,
  type ExtensionFeature,
  type ExtensionMessage,
  type PageMessage,
  type ReadProduct,
} from "@/lib/extension";

export type ProductDetails = Awaited<ReturnType<typeof scrapeProductUrl>>;

// The extension answers a hello straight away when it's installed.
const HELLO_TIMEOUT_MS = 500;
// Opening the tab, loading the page and reading it. The extension stops
// waiting for the page after 15 seconds.
const READ_TIMEOUT_MS = 30_000;

type WithoutSource<T> = T extends unknown ? Omit<T, "source"> : never;

function send(message: WithoutSource<PageMessage>) {
  window.postMessage({ source: PAGE_SOURCE, ...message }, location.origin);
}

/** The first answer from the extension that `match` picks, or null when time runs out. */
function waitFor<T>(match: (message: ExtensionMessage) => T | undefined, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      // Only the extension's content script on this page, never another frame or site.
      if (event.source !== window || event.origin !== location.origin) return;
      if (!isExtensionMessage(event.data)) return;
      const result = match(event.data);
      if (result === undefined) return;
      done();
      resolve(result);
    };
    const timer = setTimeout(() => {
      done();
      resolve(null);
    }, timeoutMs);
    function done() {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    }
    window.addEventListener("message", onMessage);
  });
}

/** What the installed extension can do for the site, or null when it isn't installed. */
function extensionFeatures(): Promise<ExtensionFeature[] | null> {
  const answer = waitFor((m) => (m.type === "ready" ? (m.features ?? []) : undefined), HELLO_TIMEOUT_MS);
  send({ type: "hello" });
  return answer;
}

function readWithExtension(url: string): Promise<ReadProduct | null> {
  const id = crypto.randomUUID();
  const answer = waitFor((m) => (m.type === "product" && m.id === id ? m : undefined), READ_TIMEOUT_MS);
  send({ type: "read-product", id, url });
  return answer.then((message) => (message ? parseReadProduct(message.product) : null));
}

interface Options {
  /** Called when the extension starts reading the link in a background tab. */
  onReadingWithExtension?: () => void;
}

/**
 * A product link's name, price and pictures. At a store the extension reads,
 * the extension reads it when it's installed. Otherwise, or when it couldn't,
 * the server fetches the page.
 */
export async function fetchProductDetails(url: string, options: Options = {}): Promise<ProductDetails> {
  // The dialogs add http:// to a link pasted without one. The stores are all on https.
  const secureUrl = url.replace(/^http:\/\//i, "https://");
  if (extensionCanReadLink(secureUrl)) {
    const features = await extensionFeatures();
    if (features?.includes("read-product")) {
      options.onReadingWithExtension?.();
      const product = await readWithExtension(secureUrl);
      if (product) {
        return {
          title: product.title,
          price: product.price != null ? product.price.toFixed(2) : undefined,
          imageUrl: product.images[0],
          imageUrls: product.images.length > 0 ? product.images : undefined,
        };
      }
    }
  }
  return scrapeProductUrl(url);
}
