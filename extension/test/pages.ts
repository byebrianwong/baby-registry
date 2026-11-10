// The store pages the tests read: copies of real registry and product pages,
// saved with save-page.js. They hold the owner's registries, so they live
// outside the repo and are never committed.

import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectStore, extensionStoreForPage, type StoreId } from "../../src/lib/retailers";

export const PAGES_DIR = process.env.REGIBEE_TEST_PAGES || path.join(os.homedir(), ".regibee", "extension-test-pages");

export interface SavedPage {
  /** The file name without .html, e.g. "amazon-registry". */
  name: string;
  file: string;
  /** The address the page was saved from. The tests serve it there. */
  url: string;
  saved: string;
  store: StoreId;
  kind: "registry" | "product";
}

const ABOUT = /<!-- regibee-test-page (\{.*?\}) -->/;

function readStart(file: string): string {
  const buffer = Buffer.alloc(4096);
  const fd = openSync(file, "r");
  try {
    return buffer.subarray(0, readSync(fd, buffer, 0, buffer.length, 0)).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

export function savedPages(kind: SavedPage["kind"]): SavedPage[] {
  if (!existsSync(PAGES_DIR)) return [];
  const pages: SavedPage[] = [];
  for (const name of readdirSync(PAGES_DIR).sort()) {
    if (!name.endsWith(".html")) continue;
    const file = path.join(PAGES_DIR, name);
    const about = readStart(file).match(ABOUT);
    if (!about) throw new Error(`${file} wasn't saved with extension/test/save-page.js: it has no regibee-test-page line.`);
    const { url, saved } = JSON.parse(about[1]) as { url: string; saved: string };
    const store = detectStore(url);
    if (!store) throw new Error(`${file} was saved from ${new URL(url).hostname}, which isn't a store in src/lib/retailers.ts.`);
    const page: SavedPage = {
      name: name.replace(/\.html$/, ""),
      file,
      url,
      saved,
      store: store.id,
      kind: extensionStoreForPage(url) ? "registry" : "product",
    };
    if (page.kind === kind) pages.push(page);
  }
  return pages;
}

export function pageHtml(page: SavedPage): string {
  return readFileSync(page.file, "utf8");
}
