"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import { hidePlainLinkReminders } from "@/lib/actions/registry";
import { getStore, type StoreId } from "@/lib/retailers";

type HideAction = (registryId: string, itemIds: string[]) => Promise<{ error?: string } | undefined>;

export interface PlainLinkGroup {
  storeId: StoreId;
  items: { id: string; title: string }[];
}

interface PlainLinksNoticeProps {
  registryId: string;
  /** Items with a plain link at a store where the owner has a registry, by store. */
  groups: PlainLinkGroup[];
  /** Stories pass a stand-in so nothing is saved. */
  hideAction?: HideAction;
}

/**
 * Shown above the items on a baby registry's dashboard when items have a
 * plain link at a store where the owner has a registry, usually because they
 * were added from a product page. Opening that store's registry with the
 * browser extension swaps in the registry links.
 */
export function PlainLinksNotice({
  registryId,
  groups,
  hideAction = hidePlainLinkReminders,
}: PlainLinksNoticeProps) {
  const [hidden, setHidden] = useState<Set<StoreId>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = groups.filter((g) => g.items.length > 0 && !hidden.has(g.storeId));
  if (visible.length === 0 && !error) return null;

  const hide = async (group: PlainLinkGroup) => {
    setHidden((prev) => new Set(prev).add(group.storeId));
    setSaving(true);
    setError("");
    const result = await hideAction(registryId, group.items.map((i) => i.id));
    setSaving(false);
    if (result?.error) {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(group.storeId);
        return next;
      });
      setError(result.error);
    }
  };

  return (
    <div className="space-y-3">
      {visible.map((group) => {
        const store = getStore(group.storeId);
        const count = group.items.length;
        const one = count === 1;
        // The owner's own view of the registry, which the extension can read.
        const openUrl = store.registryPage?.openUrl ?? `https://www.${store.domain}`;
        return (
          <div
            key={group.storeId}
            className="space-y-2.5 rounded-xl border border-warning-200 bg-warning-50 p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-700" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-warning-800">
                  {one ? `1 item has a plain ${store.name} link` : `${count} items have plain ${store.name} links`}
                </p>
                <p className="text-sm text-warning-800">
                  {one
                    ? `Gifts bought through it won't count toward your ${store.name} registry. Add it to your ${store.name} registry, then open your registry with the Regibee browser extension, and we'll swap in its registry link. You can also edit the item and paste its registry link.`
                    : `Gifts bought through them won't count toward your ${store.name} registry. Add them to your ${store.name} registry, then open your registry with the Regibee browser extension, and we'll swap in their registry links. You can also edit each item and paste its registry link.`}
                </p>
              </div>
            </div>
            <details className="group pl-6.5">
              <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-warning-800 [&::-webkit-details-marker]:hidden">
                {one ? "Which item" : "Which items"}
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="list-disc space-y-0.5 pt-1 pl-4 text-sm text-warning-800">
                {group.items.map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            </details>
            <div className="flex flex-wrap items-center gap-3 pl-6.5">
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Open my {store.name} registry
              </a>
              <button
                type="button"
                disabled={saving}
                onClick={() => hide(group)}
                className="min-h-9 px-1 text-sm font-semibold text-warning-800 underline underline-offset-2 disabled:opacity-60"
              >
                Don&apos;t remind me
              </button>
            </div>
          </div>
        );
      })}
      {error && <p className="text-sm text-error-primary">{error}</p>}
    </div>
  );
}
