// The extension on saved store registry pages: the reader (src/reader.ts)
// finds every item, and the toolbar button counts the new ones.

import type { Worker } from "@playwright/test";
import type { StoreItem } from "../../src/lib/extension";
import { classifyStoreLink, storeItemKey } from "../../src/lib/retailers";
import type { ReadResult } from "../src/messages";
import { connect, expect, openSavedPage, tabIdFor, test } from "./extension";
import { PAGES_DIR, savedPages } from "./pages";

const pages = savedPages("registry");

test.describe.configure({ mode: "parallel" });

if (pages.length === 0) {
  test("saved registry pages", () => {
    test.skip(true, `No saved registry pages in ${PAGES_DIR}. See "Tests" in extension/README.md.`);
  });
}

/** Asks the store content script on the tab what it reads, the way the popup does. */
async function readThroughExtension(worker: Worker, url: string): Promise<ReadResult> {
  const tabId = await tabIdFor(worker, url);
  // The content script starts once the page is idle, so it may not be listening yet.
  for (let attempt = 0; ; attempt++) {
    try {
      return await worker.evaluate(
        (tabId) => chrome.tabs.sendMessage(tabId, { type: "read" }) as Promise<ReadResult>,
        tabId
      );
    } catch (error) {
      if (attempt >= 20 || !String(error).includes("Receiving end does not exist")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

for (const saved of pages) {
  test.describe(saved.name, () => {
    test("reads every item with its registry link, name, price and picture", async ({ context, worker }) => {
      const tab = await openSavedPage(context, saved);
      const result = await readThroughExtension(worker, saved.url);
      expect(result.store).toBe(saved.store);
      const items: StoreItem[] = result.items;

      // Every product the page has a registry link for, in page order.
      const hrefs = await tab.locator("a[href]").evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));
      const productsOnPage = [
        ...new Set(
          hrefs
            .filter((href) => {
              const link = classifyStoreLink(href);
              return link?.store.id === saved.store && link.kind === "registry";
            })
            .map((href) => storeItemKey(href))
        ),
      ];
      expect(items.map((item) => storeItemKey(item.url))).toEqual(productsOnPage);

      for (const item of items) {
        const link = classifyStoreLink(item.url);
        expect(link?.store.id, item.url).toBe(saved.store);
        expect(link?.kind, item.url).toBe("registry");
        expect(item.title.length, item.url).toBeGreaterThanOrEqual(3);
        expect(item.imageUrl, item.title).toMatch(/^https:\/\//);
        expect(item.price === null || item.price > 0, item.title).toBe(true);
        expect(item.quantity, item.title).toBeGreaterThanOrEqual(1);
      }

      // The exact names, prices and pictures, as recorded from this page.
      // Run with --update-snapshots after saving a page again.
      expect(`${JSON.stringify(items, null, 2)}\n`).toMatchSnapshot(`${saved.name}.json`);
    });

    test("counts the new items on the toolbar button", async ({ context, worker }) => {
      // The first two items on the page are on the Regibee registry already,
      // so they don't count.
      const calls = await connect(context, worker, { existing: (urls) => urls.slice(0, 2).map((url) => storeItemKey(url)!) });
      await openSavedPage(context, saved);
      const { items } = await readThroughExtension(worker, saved.url);
      const tabId = await tabIdFor(worker, saved.url);
      const expected = String(Math.min(items.length - 2, 99));
      await expect
        .poll(() => worker.evaluate((tabId) => chrome.action.getBadgeText({ tabId }), tabId), { timeout: 15_000 })
        .toBe(expected);

      // It checked every item on the page, and only checked: asking first is the default.
      const checks = calls.filter((call) => call.path === "/api/extension/items/check");
      expect(checks).toHaveLength(1);
      expect((checks[0].body as { urls: string[] }).urls).toEqual(items.map((item) => item.url));
      expect(calls.filter((call) => call.method !== "GET" && call.path !== "/api/extension/items/check")).toEqual([]);

      const { lastChecked } = await worker.evaluate(() => chrome.storage.local.get("lastChecked"));
      expect(lastChecked[saved.store].count).toBe(items.length);
    });
  });
}
