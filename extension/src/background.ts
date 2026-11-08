// The extension's background worker. It holds the session, makes every call
// to Regibee, and decides what happens when a store registry page loads.

import {
  CONNECT_PATH,
  type AddResponse,
  type CheckResponse,
  type ExtensionRegistry,
  type ExtensionSession,
  type MeResponse,
  type StoreItem,
  type UndoResponse,
} from "@/lib/extension";
import { extensionStoreForPage, storeItemKey, type StoreId } from "@/lib/retailers";
import { api, NotConnectedError } from "./api";
import { REGIBEE_URL } from "./config";
import type {
  AutoImportResult,
  BackgroundRequest,
  CheckResult,
  PopupState,
  RegistriesResult,
  Result,
} from "./messages";
import { clearAccount, load, markSeen, save, seenKeys } from "./storage";

// Registry names rarely change, so the list is reused for a while.
const REGISTRIES_MAX_AGE_MS = 10 * 60 * 1000;
const BADGE_COLOR = "#004659";

function keysOf(items: StoreItem[]): string[] {
  return items.map((item) => storeItemKey(item.url)).filter((key): key is string => Boolean(key));
}

async function registries(refresh = false): Promise<RegistriesResult> {
  const stored = await load("registries", "registriesFetchedAt", "user", "registryId");
  let list = stored.registries;
  let user = stored.user;
  const fresh = stored.registriesFetchedAt && Date.now() - stored.registriesFetchedAt < REGISTRIES_MAX_AGE_MS;
  if (refresh || !list || !user || !fresh) {
    const me = await api<MeResponse>("/api/extension/me");
    list = me.registries;
    user = me.user;
    await save({ registries: list, user, registriesFetchedAt: Date.now() });
  }
  // Keep the chosen registry if it's still there; otherwise use the newest.
  let registryId = stored.registryId && list.some((r) => r.id === stored.registryId) ? stored.registryId : null;
  if (!registryId && list.length > 0) {
    registryId = list[0].id;
    await save({ registryId });
  }
  return { user, registries: list, registryId };
}

async function currentRegistry(): Promise<ExtensionRegistry | null> {
  const { registries: list, registryId } = await registries();
  return list.find((r) => r.id === registryId) ?? null;
}

async function check(registryId: string, items: StoreItem[]): Promise<CheckResult> {
  const { existing } = await api<CheckResponse>("/api/extension/items/check", {
    method: "POST",
    body: { registryId, urls: items.map((i) => i.url) },
  });
  await markSeen(registryId, existing);
  return { existing };
}

async function add(registryId: string, items: StoreItem[], listed: string[]): Promise<AddResponse> {
  const result = await api<AddResponse>("/api/extension/items", {
    method: "POST",
    body: { registryId, items },
  });
  // Everything the owner saw in the popup counts as seen, added or not, so
  // automatic mode won't add an item they chose to leave out.
  await markSeen(registryId, [...listed, ...keysOf(items)]);
  return result;
}

async function recordChecked(store: StoreId, count: number) {
  const { lastChecked = {} } = await load("lastChecked");
  lastChecked[store] = { at: Date.now(), count };
  await save({ lastChecked });
}

function setBadge(tabId: number | undefined, count: number) {
  if (tabId === undefined) return;
  void chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
  void chrome.action.setBadgeText({ tabId, text: count > 0 ? String(Math.min(count, 99)) : "" });
}

/**
 * A store registry page finished loading. Ask first: show how many new items
 * there are on the toolbar button. Automatic: add the new items now, and the
 * content script shows a notice with Undo.
 */
async function onPageItems(store: StoreId, items: StoreItem[], tabId?: number): Promise<AutoImportResult> {
  const none: AutoImportResult = { added: [], registry: null };
  await recordChecked(store, items.length);
  const { session, mode = "ask" } = await load("session", "mode");
  if (!session || items.length === 0) return none;

  const registry = await currentRegistry();
  if (!registry) return none;

  const { existing } = await check(registry.id, items);
  const onRegistry = new Set(existing);
  const fresh = items.filter((item) => {
    const key = storeItemKey(item.url);
    return key && !onRegistry.has(key);
  });

  if (mode !== "auto") {
    setBadge(tabId, fresh.length);
    return none;
  }

  const seen = await seenKeys(registry.id);
  const unseen = fresh.filter((item) => !seen.has(storeItemKey(item.url)!));
  setBadge(tabId, 0);
  if (unseen.length === 0) return none;
  const result = await add(registry.id, unseen, []);
  return { added: result.added, registry: { id: registry.id, title: registry.title } };
}

async function onConnectSession(session: ExtensionSession) {
  await clearAccount();
  await save({ session });
  // Check the session works before telling the page it's connected.
  await registries(true);
}

async function disconnect() {
  try {
    await api("/api/extension/disconnect", { method: "POST" });
  } catch {
    // Forget the session either way. If the call failed, it expires on its own.
  }
  await clearAccount();
}

async function popupState(): Promise<PopupState> {
  const { session, user, mode = "ask", registryId, lastChecked = {} } = await load(
    "session",
    "user",
    "mode",
    "registryId",
    "lastChecked"
  );
  return { connected: Boolean(session), user: user ?? null, mode, registryId: registryId ?? null, lastChecked };
}

function isConnectPage(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const site = new URL(REGIBEE_URL);
    // regibee.com redirects to www.regibee.com, so accept both.
    const sameSite =
      parsed.protocol === site.protocol &&
      parsed.port === site.port &&
      parsed.hostname.replace(/^www\./, "") === site.hostname.replace(/^www\./, "");
    return sameSite && parsed.pathname === CONNECT_PATH;
  } catch {
    return false;
  }
}

async function handle(request: BackgroundRequest, sender: chrome.runtime.MessageSender): Promise<unknown> {
  // Only this extension's own pages and content scripts can message it, but
  // check the content-script messages came from the pages they belong to.
  if (sender.id !== chrome.runtime.id) throw new Error("Unknown sender");

  switch (request.type) {
    case "state":
      return popupState();
    case "open-connect":
      await chrome.tabs.create({ url: `${REGIBEE_URL}${CONNECT_PATH}` });
      return null;
    case "disconnect":
      await disconnect();
      return null;
    case "registries":
      return registries(request.refresh);
    case "set-registry":
      await save({ registryId: request.registryId });
      return null;
    case "set-mode":
      await save({ mode: request.mode === "auto" ? "auto" : "ask" });
      return null;
    case "check":
      await recordChecked(request.store, request.items.length);
      return check(request.registryId, request.items);
    case "add":
      return add(request.registryId, request.items, request.listed);
    case "undo": {
      const result = await api<UndoResponse>("/api/extension/items", {
        method: "DELETE",
        body: { registryId: request.registryId, itemIds: request.itemIds },
      });
      return result;
    }
    case "page-items": {
      const store = extensionStoreForPage(sender.url);
      if (!store || store.id !== request.store) throw new Error("Not a store registry page");
      return onPageItems(store.id, request.items, sender.tab?.id);
    }
    case "connect-session":
      if (!isConnectPage(sender.url)) throw new Error("Not the Regibee connect page");
      await onConnectSession(request.session);
      return null;
    case "connect-cancel":
      if (isConnectPage(sender.url) && sender.tab?.id !== undefined) {
        await chrome.tabs.remove(sender.tab.id);
      }
      return null;
  }
}

chrome.runtime.onMessage.addListener((request: BackgroundRequest, sender, sendResponse) => {
  handle(request, sender)
    .then((data) => sendResponse({ ok: true, data } satisfies Result<unknown>))
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        notConnected: error instanceof NotConnectedError,
      } satisfies Result<unknown>)
    );
  // Keep the channel open for the async answer.
  return true;
});

// First install: open the Connect page so the owner can sign in right away.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void chrome.tabs.create({ url: `${REGIBEE_URL}${CONNECT_PATH}` });
  }
});
