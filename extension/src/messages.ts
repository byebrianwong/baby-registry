// Messages between the popup, the content scripts and the background worker.

import type { AddResponse, ExtensionRegistry, ExtensionSession, LinkResponse, ProductItem, StoreItem } from "@/lib/extension";
import type { StoreId } from "@/lib/retailers";

export type Mode = "ask" | "auto";

export interface StoreCheck {
  at: number;
  count: number;
}

export interface PopupState {
  connected: boolean;
  user: { name: string; email: string | null } | null;
  mode: Mode;
  registryId: string | null;
  lastChecked: Partial<Record<StoreId, StoreCheck>>;
}

export interface CheckResult {
  /** storeItemKey values already on the registry. */
  existing: string[];
  /** Items on the registry whose plain store link the check swapped for a registry link. */
  linked: LinkResponse["linked"];
}

export interface AutoImportResult {
  added: AddResponse["added"];
  linked: LinkResponse["linked"];
  registry: { id: string; title: string } | null;
}

/** The right-click menu item the owner just used, for the popup it opened. */
export interface MenuClick {
  tabId: number;
  /** The picture they right-clicked, if it was one. */
  imageUrl: string | null;
}

/** Requests to the background worker. */
export type BackgroundRequest =
  | { type: "state" }
  | { type: "open-connect" }
  | { type: "disconnect" }
  | { type: "registries"; refresh?: boolean }
  | { type: "set-registry"; registryId: string }
  | { type: "set-mode"; mode: Mode }
  | { type: "check"; registryId: string; store: StoreId; items: StoreItem[] }
  | { type: "add"; registryId: string; items: StoreItem[]; listed: string[] }
  | { type: "undo"; registryId: string; itemIds: string[] }
  // From the popup, opened by the right-click menu.
  | { type: "menu-click" }
  // From the popup's "Add to Regibee" form on a product page.
  | { type: "check-url"; registryId: string; url: string }
  | { type: "add-product"; registryId: string; item: ProductItem }
  // Swaps in a registry link for an item already on Regibee with a plain one.
  | { type: "link"; registryId: string; items: StoreItem[] }
  // From the store content script, once a registry page has loaded.
  | { type: "page-items"; store: StoreId; items: StoreItem[] }
  // From the connect content script on regibee.com.
  | { type: "connect-session"; session: ExtensionSession }
  | { type: "connect-cancel" };

export interface RegistriesResult {
  user: { name: string; email: string | null };
  registries: ExtensionRegistry[];
  registryId: string | null;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; notConnected?: boolean };

/** Requests from the popup to the store content script. */
export type ContentRequest = { type: "read" };

export type ReadResult = { store: StoreId; items: StoreItem[] } | { store: null; items: [] };

/** Sends a request to the background worker and unwraps its result. */
export async function ask<T>(request: BackgroundRequest): Promise<Result<T>> {
  try {
    const response = (await chrome.runtime.sendMessage(request)) as Result<T> | undefined;
    return response ?? { ok: false, error: "The extension didn't answer." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
