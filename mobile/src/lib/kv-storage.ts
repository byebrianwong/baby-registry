// Small key-value storage on the phone, in SQLite. It holds the Supabase
// session and the cached registries, so the app opens on the last data it
// saw instead of a spinner.

import Storage from "expo-sqlite/kv-store";

export interface KvStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const kvStorage: KvStorage = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: (key) => Storage.removeItem(key),
};
