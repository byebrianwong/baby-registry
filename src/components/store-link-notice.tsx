"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  classifyStoreLink,
  copyLinkSteps,
  type RetailerRegistry,
  type StoreInfo,
} from "@/lib/retailers";

interface StoreLinkNoticeProps {
  /** The item link as typed or pasted. */
  url: string;
  registryId: string;
  /** The registry owner's linked store registries, from settings. */
  linkedRegistries: RetailerRegistry[];
  className?: string;
}

/**
 * Shown under the product link field in the add and edit item dialogs when the
 * link is from a store where owners can have a registry. It says whether the
 * link will count toward the owner's store registry, and how to get the
 * registry link when it won't.
 */
export function StoreLinkNotice({ url, registryId, linkedRegistries, className }: StoreLinkNoticeProps) {
  // Remember which link the owner dismissed, so pasting a new one shows the
  // notice again.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const result = classifyStoreLink(url);
  if (!result || dismissedFor === url) return null;
  const { store, kind } = result;
  const linked = linkedRegistries.find((r) => r.store === store.id);

  if (!linked) {
    return (
      <div className={cn("space-y-2.5 rounded-lg border border-brand-200 bg-primary p-3", className)}>
        <div className="flex items-start gap-2.5">
          <Package className="mt-px h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">Have a {store.name} registry?</span>{" "}
            Link it so gifts bought at {store.name} can count toward it and earn you its perks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pl-6.5">
          <a
            href={`/dashboard/registry/${registryId}/settings#store-registries`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-full bg-primary px-3.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
          >
            Link {store.name} registry
          </a>
          <button
            type="button"
            onClick={() => setDismissedFor(url)}
            className="min-h-9 px-1 text-sm font-semibold text-tertiary hover:text-secondary"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (kind === "registry") {
    return (
      <div className={cn("flex items-start gap-2.5 rounded-lg border border-success-200 bg-success-50 px-3 py-2.5", className)}>
        <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success-700" aria-hidden="true" />
        <p className="text-sm text-success-800">
          <span className="font-semibold">{store.name} registry link.</span> Gifts bought
          through this link count toward your {store.name} registry.
        </p>
      </div>
    );
  }

  if (kind === "plain") {
    return (
      <div className={cn("space-y-2.5 rounded-lg border border-warning-200 bg-warning-50 p-3", className)}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-warning-700" aria-hidden="true" />
          <p className="text-sm text-warning-800">
            <span className="font-semibold">This looks like a regular {store.name} link.</span>{" "}
            Gifts bought through it may not count toward your {store.name} registry.
          </p>
        </div>
        <div className="space-y-2 pl-6.5">
          <p className="text-xs font-semibold text-warning-800">To use your registry link instead</p>
          <CopySteps store={store} className="text-warning-800" />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <OpenRegistryLink store={store} url={linked.url} />
            <button
              type="button"
              onClick={() => setDismissedFor(url)}
              className="min-h-9 px-1 text-sm font-semibold text-warning-800 underline underline-offset-2"
            >
              Use this link anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  // We can't tell from the link alone, so explain rather than warn.
  return (
    <div className={cn("space-y-2 rounded-lg border border-brand-200 bg-primary p-3", className)}>
      <p className="text-sm text-secondary">
        <span className="font-semibold text-primary">{store.name} link.</span> If you
        copied it from your {store.name} registry, gifts bought through it count
        toward that registry.
      </p>
      <details className="group">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-secondary [&::-webkit-details-marker]:hidden">
          How to copy your registry link
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-2.5 pt-1">
          <CopySteps store={store} className="text-secondary" />
          <OpenRegistryLink store={store} url={linked.url} />
        </div>
      </details>
    </div>
  );
}

function CopySteps({ store, className }: { store: StoreInfo; className?: string }) {
  return (
    <ol className={cn("list-decimal space-y-0.5 pl-4 text-xs leading-relaxed", className)}>
      {copyLinkSteps(store).map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function OpenRegistryLink({ store, url }: { store: StoreInfo; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Open my {store.name} registry
    </a>
  );
}
