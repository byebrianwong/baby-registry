"use client";

import { useId, useState } from "react";
import { ChevronDown, Info, Link as LinkIcon, Package, Percent, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateRetailerRegistries } from "@/lib/actions/registry";
import {
  getStore,
  isLinkForStore,
  isStoreId,
  STORES,
  type RetailerRegistry,
  type StoreId,
} from "@/lib/retailers";

type SaveAction = (
  registryId: string,
  registries: RetailerRegistry[]
) => Promise<{ error?: string; registries?: RetailerRegistry[] } | undefined>;

interface StoreRegistriesCardProps {
  registryId: string;
  initialRegistries: RetailerRegistry[];
  /** Stories pass a stand-in so nothing is saved. */
  saveAction?: SaveAction;
}

const PERKS = [
  { icon: Percent, label: "Completion discount" },
  { icon: RotateCcw, label: "Longer returns" },
  { icon: Package, label: "Welcome box" },
];

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

export function StoreRegistriesCard({
  registryId,
  initialRegistries,
  saveAction = updateRetailerRegistries,
}: StoreRegistriesCardProps) {
  const [registries, setRegistries] = useState<RetailerRegistry[]>(initialRegistries);
  const [store, setStore] = useState<StoreId | "">("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const storeSelectId = useId();

  const unlinkedStores = STORES.filter((s) => !registries.some((r) => r.store === s.id));

  const save = async (next: RetailerRegistry[]) => {
    setSaving(true);
    setError("");
    const result = await saveAction(registryId, next);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return false;
    }
    setRegistries(result?.registries ?? next);
    return true;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) {
      setError("Choose a store.");
      return;
    }
    const trimmed = url.trim();
    const name = getStore(store).name;
    if (!trimmed) {
      setError(`Paste the link to your ${name} registry.`);
      return;
    }
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (!isLinkForStore(full, store)) {
      setError(`That doesn't look like a ${name} link.`);
      return;
    }
    if (await save([...registries, { store, url: full }])) {
      setStore("");
      setUrl("");
    }
  };

  const handleRemove = (storeId: StoreId) => {
    save(registries.filter((r) => r.store !== storeId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your store registries</CardTitle>
        <CardDescription>
          Made a registry at Amazon, Target or another store? Link it here. When a
          guest buys through your registry link, the store counts the gift toward
          your registry, so you keep its perks.
        </CardDescription>
        <ul className="flex flex-wrap gap-2 pt-2" aria-label="Perks stores may offer">
          {PERKS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent className="space-y-5">
        {registries.length > 0 && (
          <ul className="divide-y divide-secondary rounded-xl border border-secondary">
            {registries.map((r) => {
              const s = getStore(r.store);
              return (
                <li key={r.store} className="flex items-center gap-3 px-3.5 py-3">
                  <span
                    aria-hidden="true"
                    className="font-display inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary"
                  >
                    {s.name.charAt(0)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold text-primary">{s.name}</span>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-tertiary hover:underline"
                    >
                      {displayUrl(r.url)}
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleRemove(r.store)}
                    aria-label={`Remove ${s.name} registry`}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {unlinkedStores.length > 0 && (
          <form onSubmit={handleAdd} className="space-y-2" noValidate>
            <p className="text-sm font-semibold text-primary">Add a store registry</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              {/* A plain select rather than NativeSelect, which gives its
                  label and select the same id. */}
              <div className="flex flex-col gap-1.5 sm:w-40 sm:shrink-0">
                <Label htmlFor={storeSelectId}>Store</Label>
                <div className="relative grid items-center">
                  <select
                    id={storeSelectId}
                    value={store}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStore(isStoreId(v) ? v : "");
                      setError("");
                    }}
                    className="appearance-none rounded-lg bg-primary py-2 pl-3.5 pr-9 text-md text-primary shadow-xs ring-1 ring-primary outline-hidden ring-inset focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">Choose store</option>
                    {unlinkedStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 h-4 w-4 text-fg-quaternary"
                  />
                </div>
              </div>
              <Input
                label="Registry link"
                // Plain text: links pasted without https:// are fine, but a
                // url field would mark them invalid.
                type="text"
                inputMode="url"
                placeholder="Paste the link to your registry"
                value={url}
                onChange={(v) => {
                  setUrl(v);
                  setError("");
                }}
                className="min-w-0 flex-1"
              />
              <Button type="submit" disabled={saving} className="shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <LinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {saving ? "Saving…" : "Link"}
                </span>
              </Button>
            </div>
          </form>
        )}

        {error && <p className="text-sm text-error-primary">{error}</p>}

        <p className="flex items-start gap-1.5 text-xs text-tertiary">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Guests don&apos;t see these links. They shop from your Regibee list.
        </p>
      </CardContent>
    </Card>
  );
}
