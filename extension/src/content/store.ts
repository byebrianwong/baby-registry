// Runs on the stores' sites. On a registry page it reads the items once the
// page has settled, tells the background worker, and answers the popup. The
// worker adds new items (automatic mode) and swaps in registry links for
// items already on Regibee, and this shows a notice when it did either.

import { extensionStoreForPage, getStore, storeItemKey } from "@/lib/retailers";
import { REGIBEE_URL } from "../config";
import { ask, type AutoImportResult, type ContentRequest, type ReadResult } from "../messages";
import { readRegistryItems } from "../reader";
import { showImportToast } from "../toast";

// Registry pages fill in their items after they open. Wait for the page to
// stop changing for a moment, but not forever.
const QUIET_MS = 1500;
const MAX_WAIT_MS = 8000;
// Pages that load more items as you scroll report again, at most this often.
const MIN_REPORT_GAP_MS = 5000;

function read(): ReadResult {
  const store = extensionStoreForPage(location.href);
  if (!store) return { store: null, items: [] };
  return { store: store.id, items: readRegistryItems(document, store, location.href) };
}

let settled: Promise<void> = Promise.resolve();
let lastReported = "";
let lastReportAt = 0;
let pendingReport: ReturnType<typeof setTimeout> | null = null;

function waitForQuiet(): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer = setTimeout(done, QUIET_MS);
    const maxTimer = setTimeout(done, MAX_WAIT_MS);
    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(done, QUIET_MS);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    function done() {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    }
  });
}

async function report() {
  const result = read();
  if (!result.store || result.items.length === 0) return;
  const signature = result.items.map((i) => storeItemKey(i.url)).join(",");
  if (signature === lastReported) return;
  lastReported = signature;
  lastReportAt = Date.now();

  const response = await ask<AutoImportResult>({ type: "page-items", store: result.store, items: result.items });
  if (!response.ok || !response.data.registry) return;
  const { added, linked, registry } = response.data;
  if (added.length === 0 && linked.length === 0) return;
  showImportToast({
    count: added.length,
    linkedCount: linked.length,
    storeName: getStore(result.store).name,
    registryTitle: registry.title,
    reviewUrl: `${REGIBEE_URL}/dashboard/registry/${registry.id}`,
    onUndo: async () => {
      const undo = await ask<{ removed: number }>({
        type: "undo",
        registryId: registry.id,
        itemIds: added.map((a) => a.id),
      });
      if (!undo.ok) throw new Error(undo.error);
      return undo.data.removed;
    },
  });
}

function scheduleReport() {
  if (pendingReport) return;
  const wait = Math.max(0, MIN_REPORT_GAP_MS - (Date.now() - lastReportAt));
  pendingReport = setTimeout(() => {
    pendingReport = null;
    void report();
  }, wait);
}

function onPage() {
  if (!extensionStoreForPage(location.href)) return;
  settled = waitForQuiet();
  void settled.then(report);
}

// More items can appear as the owner scrolls. Report those too.
const growthObserver = new MutationObserver(() => {
  if (extensionStoreForPage(location.href) && lastReportAt > 0) scheduleReport();
});

// Some stores change pages without a full load. Notice when the address changes.
let lastHref = location.href;
setInterval(() => {
  if (location.href === lastHref) return;
  lastHref = location.href;
  lastReported = "";
  onPage();
}, 1000);

chrome.runtime.onMessage.addListener((request: ContentRequest, _sender, sendResponse) => {
  if (request?.type !== "read") return false;
  // Give a page that's still loading a few seconds to finish first.
  void Promise.race([settled, new Promise((r) => setTimeout(r, 3000))]).then(() => sendResponse(read()));
  return true;
});

onPage();
growthObserver.observe(document.documentElement, { childList: true, subtree: true });
