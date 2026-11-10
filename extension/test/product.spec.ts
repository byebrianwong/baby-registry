// The extension on saved store product pages: the product reader
// (src/product-reader.ts) reads the name, price and pictures, and keeps the
// page's address exactly, so a product opened from a store registry keeps
// its registry link. The popup's "Add to Regibee" form shows what it read.

import { classifyStoreLink } from "../../src/lib/retailers";
import { readProductPage } from "../src/product-reader";
import { connect, expect, openSavedPage, tabIdFor, test } from "./extension";
import { PAGES_DIR, savedPages } from "./pages";

const pages = savedPages("product");

test.describe.configure({ mode: "parallel" });

if (pages.length === 0) {
  test("saved product pages", () => {
    test.skip(true, `No saved product pages in ${PAGES_DIR}. See "Tests" in extension/README.md.`);
  });
}

for (const saved of pages) {
  test.describe(saved.name, () => {
    test("reads the name, price and pictures, and keeps the address", async ({ context }) => {
      const tab = await openSavedPage(context, saved);
      // Chrome copies the reader into the page by its source text, the same
      // way the popup's chrome.scripting.executeScript does.
      const product = await tab.evaluate(readProductPage);

      expect(product.url).toBe(saved.url);
      expect(product.isProduct).toBe(true);
      expect(product.title.length).toBeGreaterThanOrEqual(3);
      expect(product.price).toBeGreaterThan(0);
      expect(product.images.length).toBeGreaterThan(0);
      for (const image of product.images) expect(image).toMatch(/^https:\/\//);

      // The exact name, price and pictures, as recorded from this page.
      // Run with --update-snapshots after saving a page again.
      expect(`${JSON.stringify(product, null, 2)}\n`).toMatchSnapshot(`${saved.name}.json`);
    });

    test("fills in the Add to Regibee form", async ({ context, worker, extensionId }) => {
      await connect(context, worker);
      const tab = await openSavedPage(context, saved);
      const product = await tab.evaluate(readProductPage);
      const tabId = await tabIdFor(worker, saved.url);

      // The popup, opened as a page about that tab.
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
      await expect(popup.locator("#title")).toHaveValue(product.title);
      await expect(popup.locator("#price")).toHaveValue(product.price!.toFixed(2));
      await expect(popup.locator("img.product-image")).toHaveAttribute("src", product.images[0]);
      if (product.images.length > 1) await expect(popup.getByText(`1 of ${product.images.length}`)).toBeVisible();
      if (classifyStoreLink(saved.url)?.kind === "registry") {
        await expect(popup.locator(".ok-note")).toContainText("registry link");
      }
    });
  });
}
