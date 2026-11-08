// What the extension keeps in chrome.storage.local.

import type { ExtensionRegistry, ExtensionSession } from "@/lib/extension";
import type { StoreId } from "@/lib/retailers";
import type { Mode, StoreCheck } from "./messages";

export interface Stored {
  session?: ExtensionSession;
  user?: { name: string; email: string | null };
  mode?: Mode;
  /** The Regibee registry new items go to. */
  registryId?: string;
  registries?: ExtensionRegistry[];
  registriesFetchedAt?: number;
  lastChecked?: Partial<Record<StoreId, StoreCheck>>;
  /**
   * Item keys the owner has already seen, per registry: on Regibee at some
   * check, listed in the popup, added, or undone. Automatic mode adds only
   * items it hasn't seen, so an item removed on Regibee doesn't come back.
   */
  seen?: Record<string, string[]>;
}

const MAX_SEEN_PER_REGISTRY = 3000;

export async function load<K extends keyof Stored>(...keys: K[]): Promise<Pick<Stored, K>> {
  return (await chrome.storage.local.get(keys)) as Pick<Stored, K>;
}

export async function save(values: Partial<Stored>): Promise<void> {
  await chrome.storage.local.set(values);
}

/** Forgets the account: the session and everything read with it. */
export async function clearAccount(): Promise<void> {
  await chrome.storage.local.remove(["session", "user", "registryId", "registries", "registriesFetchedAt", "seen"]);
}

export async function markSeen(registryId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { seen = {} } = await load("seen");
  const merged = new Set([...(seen[registryId] ?? []), ...keys]);
  seen[registryId] = [...merged].slice(-MAX_SEEN_PER_REGISTRY);
  await save({ seen });
}

export async function seenKeys(registryId: string): Promise<Set<string>> {
  const { seen = {} } = await load("seen");
  return new Set(seen[registryId] ?? []);
}
