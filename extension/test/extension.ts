// Runs the built extension (extension/dist) in Playwright's Chromium, with
// saved store pages served at their real addresses. Nothing reaches the
// internet: every host name fails to resolve, and every request the tests
// don't answer is refused. Calls to Regibee's API get canned answers, so the
// tests never touch the production database.

import { test as base, chromium, type BrowserContext, type Page, type Worker } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CheckResponse, ExtensionRegistry, ExtensionSession, MeResponse } from "../../src/lib/extension";
import { pageHtml, type SavedPage } from "./pages";

const DIST = path.resolve(__dirname, "../dist");
const API = "https://www.regibee.com/api/extension/";
// A 1×1 transparent PNG for every picture. save-page.js gave each picture
// the size it loaded at, so the page lays out the same.
const PICTURE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

export const REGISTRY: ExtensionRegistry = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Remi & Max",
  storeRegistries: [],
  categories: [],
};

export interface ApiCall {
  method: string;
  path: string;
  body: unknown;
}

interface Fixtures {
  context: BrowserContext;
  /** The extension's background worker. */
  worker: Worker;
  extensionId: string;
}

export const test = base.extend<Fixtures>({
  context: async ({ headless }, use) => {
    if (!existsSync(path.join(DIST, "manifest.json"))) {
      throw new Error("extension/dist is missing. Run npm run test:extension, which builds it first.");
    }
    const context = await chromium.launchPersistentContext("", {
      // Playwright's full Chromium, not its headless shell: the shell can't load extensions.
      channel: "chromium",
      headless,
      viewport: { width: 1280, height: 900 },
      args: [
        `--disable-extensions-except=${DIST}`,
        `--load-extension=${DIST}`,
        // No host name resolves, so nothing the tests don't answer below can
        // reach a store or Regibee, including the Connect page the extension
        // opens when it's installed.
        "--host-resolver-rules=MAP * ~NOTFOUND",
      ],
    });
    // Every web request, but not the extension's own files. Routes run
    // newest first, so the tests' own routes come before this one.
    await context.route(
      (url) => url.protocol === "https:" || url.protocol === "http:",
      (route) =>
        route.request().resourceType() === "image"
          ? route.fulfill({ contentType: "image/png", body: PICTURE })
          : route.abort("blockedbyclient")
    );
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});

export { expect } from "@playwright/test";

/** Opens a saved page in a new tab, served at the address it was saved from. */
export async function openSavedPage(context: BrowserContext, saved: SavedPage): Promise<Page> {
  const html = pageHtml(saved);
  await context.route(
    (url) => url.href === saved.url,
    (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html })
  );
  const tab = await context.newPage();
  await tab.goto(saved.url);
  return tab;
}

/** The extension's id for a tab, found by its address. */
export async function tabIdFor(worker: Worker, url: string): Promise<number> {
  const id = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url)?.id, url);
  if (id === undefined) throw new Error(`No tab open at ${url}`);
  return id;
}

/**
 * Signs the extension in with a made-up session and answers its calls to
 * Regibee's API: one registry, with the items `existing` picks from each
 * check already on it. Any other call gets an error. Returns the calls, so
 * tests can check them.
 */
export async function connect(
  context: BrowserContext,
  worker: Worker,
  { existing = () => [] }: { existing?: (urls: string[]) => string[] } = {}
) {
  const session: ExtensionSession = {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };
  await worker.evaluate((session) => chrome.storage.local.set({ session, mode: "ask" }), session);

  const calls: ApiCall[] = [];
  await context.route(`${API}**`, async (route) => {
    const request = route.request();
    const call: ApiCall = { method: request.method(), path: new URL(request.url()).pathname, body: request.postDataJSON() };
    calls.push(call);
    if (call.method === "GET" && call.path === "/api/extension/me") {
      const me: MeResponse = { user: { name: "Remi", email: null }, registries: [REGISTRY] };
      return route.fulfill({ json: me });
    }
    if (call.method === "POST" && call.path === "/api/extension/items/check") {
      const check: CheckResponse = { existing: existing((call.body as { urls: string[] }).urls), plain: [] };
      return route.fulfill({ json: check });
    }
    return route.fulfill({ status: 500, json: { error: `The tests don't answer ${call.method} ${call.path}.` } });
  });
  return calls;
}
