// Remembers the registry the owner last added to, so sharing a product goes
// there by default.

import { useEffect, useState } from "react";

import { kvStorage } from "@/lib/kv-storage";
import type { RegistrySummary } from "@/lib/types";

const KEY = "last-registry-id";

export function rememberRegistry(id: string) {
  kvStorage.setItem(KEY, id).catch(() => {});
}

/**
 * The registry to add to: the one asked for, else the last one used, else the
 * first. Undefined until the saved choice has been read.
 */
export function useDefaultRegistry(registries: RegistrySummary[] | undefined, requested?: string | null) {
  const [saved, setSaved] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    kvStorage
      .getItem(KEY)
      .then(setSaved)
      .catch(() => setSaved(null));
  }, []);

  if (!registries || saved === undefined) return undefined;
  const ids = registries.map((r) => r.id);
  if (requested && ids.includes(requested)) return requested;
  if (saved && ids.includes(saved)) return saved;
  return ids[0] ?? null;
}
