// The web build (used only to preview screens) keeps the same data in the
// browser's localStorage.

import type { KvStorage } from "./kv-storage";

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const kvStorage: KvStorage = {
  getItem: async (key) => store()?.getItem(key) ?? null,
  setItem: async (key, value) => store()?.setItem(key, value),
  removeItem: async (key) => store()?.removeItem(key),
};
