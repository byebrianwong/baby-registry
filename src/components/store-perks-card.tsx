"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Info, Package } from "lucide-react";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateStorePerks } from "@/lib/actions/registry";
import { cn } from "@/lib/utils";
import type { StoreId } from "@/lib/retailers";
import type { PerkTone, StorePerksRow } from "@/lib/store-perks";

type SaveAction = (
  registryId: string,
  change: { welcomeBoxDone?: { store: StoreId; done: boolean }; emails?: boolean }
) => Promise<{ error?: string } | undefined>;

interface StorePerksCardProps {
  registryId: string;
  rows: StorePerksRow[];
  /** Whether the owner gets perk emails. */
  emails: boolean;
  hasDueDate: boolean;
  /** Stories pass a stand-in so nothing is saved. */
  saveAction?: SaveAction;
}

const TONE_CLASSES: Record<PerkTone, string> = {
  ready: "bg-success-50 text-success-800 ring-success-200",
  waiting: "bg-secondary text-secondary ring-secondary",
  upcoming: "bg-brand-50 text-brand-700 ring-brand-200",
  done: "bg-primary text-tertiary ring-secondary",
};

function PerkPill({ label, status, tone }: { label: string; status: string; tone: PerkTone }) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
        TONE_CLASSES[tone]
      )}
    >
      {tone === "done" && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span className="font-semibold">{label}</span>
      <span aria-hidden="true">·</span>
      <span>{status}</span>
    </li>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function giftCountText(row: StorePerksRow): string {
  const items = `${row.itemCount} ${row.itemCount === 1 ? "item" : "items"}`;
  const gifts =
    row.giftCount === 0
      ? "no gifts yet"
      : `${row.giftCount} ${row.giftCount === 1 ? "gift" : "gifts"} reserved`;
  return `${items} · ${gifts}`;
}

/**
 * The Store perks tab on a baby registry's dashboard: each store registry the
 * owner has, the perks it may give them, and how far along each one is.
 */
export function StorePerksCard({
  registryId,
  rows,
  emails: initialEmails,
  hasDueDate,
  saveAction = updateStorePerks,
}: StorePerksCardProps) {
  const [done, setDone] = useState<Set<StoreId>>(
    () => new Set(rows.filter((r) => r.welcomeBox?.status === "done").map((r) => r.storeId))
  );
  const [emails, setEmails] = useState(initialEmails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setWelcomeBoxDone = async (store: StoreId, isDone: boolean) => {
    const next = new Set(done);
    if (isDone) next.add(store);
    else next.delete(store);
    const previous = done;
    setDone(next);
    setSaving(true);
    setError("");
    const result = await saveAction(registryId, { welcomeBoxDone: { store, done: isDone } });
    setSaving(false);
    if (result?.error) {
      setDone(previous);
      setError(result.error);
    }
  };

  const toggleEmails = async (on: boolean) => {
    setEmails(on);
    setSaving(true);
    setError("");
    const result = await saveAction(registryId, { emails: on });
    setSaving(false);
    if (result?.error) {
      setEmails(!on);
      setError(result.error);
    }
  };

  // Worked out here rather than read from the row, so marking a box done (or
  // undoing it) shows straight away.
  const welcomeStatus = (row: StorePerksRow): "waiting" | "ready" | "done" | null => {
    if (!row.welcomeBox) return null;
    if (done.has(row.storeId)) return "done";
    return row.welcomeBox.afterGift && row.giftCount === 0 ? "waiting" : "ready";
  };

  // Welcome boxes a reserved gift has unlocked get a banner, since that's news.
  const giftUnlocked = rows.filter(
    (r) => r.welcomeBox?.afterGift && welcomeStatus(r) === "ready"
  );
  const settingsHref = `/dashboard/registry/${registryId}/settings`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store perks</CardTitle>
        <CardDescription>
          Perks your store registries may give you. Rules change and differ by store, so
          check each store&apos;s terms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {giftUnlocked.map((row) => (
          <div
            key={row.storeId}
            className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-3.5"
          >
            <Package className="mt-0.5 h-4.5 w-4.5 shrink-0 text-success-700" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <p className="text-sm text-success-800">
                <span className="font-semibold">
                  {row.giftCount === 1
                    ? `Your first ${row.name} gift was reserved.`
                    : `Guests have reserved gifts from your ${row.name} registry.`}
                </span>{" "}
                You may be able to request your {row.name} {row.welcomeBox!.name} now.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={row.registryUrl ?? `https://www.${row.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-solid px-3.5 text-sm font-semibold text-white hover:bg-brand-solid_hover max-sm:min-h-11"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Request at {row.name}
                </a>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setWelcomeBoxDone(row.storeId, true)}
                  className="min-h-9 px-1 text-sm font-semibold text-success-800 hover:underline disabled:opacity-60 max-sm:min-h-11"
                >
                  Done, hide this
                </button>
              </div>
            </div>
          </div>
        ))}

        <ul className="divide-y divide-secondary rounded-xl border border-secondary">
          {rows.map((row) => {
            const status = welcomeStatus(row);
            return (
              <li key={row.storeId} className="flex flex-col gap-2.5 px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="font-display inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary"
                  >
                    {row.name.charAt(0)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold text-primary">{row.name}</span>
                    <span className="text-xs text-tertiary">{giftCountText(row)}</span>
                  </div>
                  {row.registryUrl ? (
                    <a
                      href={row.registryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-1 py-2 text-sm font-semibold text-brand-secondary hover:underline max-sm:py-3"
                    >
                      Open registry
                    </a>
                  ) : (
                    <Link
                      href={`${settingsHref}#store-registries`}
                      className="shrink-0 px-1 py-2 text-sm font-semibold text-brand-secondary hover:underline max-sm:py-3"
                    >
                      Link registry
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:pl-11">
                  <ul className="flex flex-wrap gap-1.5" aria-label={`${row.name} perks`}>
                    {row.welcomeBox && status && (
                      <PerkPill
                        label={capitalize(row.welcomeBox.name)}
                        status={
                          status === "done"
                            ? "Requested"
                            : status === "waiting"
                              ? "After first gift"
                              : "Ready to request"
                        }
                        tone={status === "done" ? "done" : status === "waiting" ? "waiting" : "ready"}
                      />
                    )}
                    {row.perks.map((p) => (
                      <PerkPill key={p.label} {...p} />
                    ))}
                  </ul>
                  {/* Boxes a gift unlocked already have the banner's button. */}
                  {status === "ready" && !row.welcomeBox?.afterGift && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setWelcomeBoxDone(row.storeId, true)}
                      className="min-h-8 text-xs font-semibold text-brand-secondary hover:underline disabled:opacity-60 max-sm:min-h-11 max-sm:px-2"
                    >
                      I requested it
                    </button>
                  )}
                  {status === "done" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setWelcomeBoxDone(row.storeId, false)}
                      className="min-h-8 text-xs font-semibold text-tertiary hover:underline disabled:opacity-60 max-sm:min-h-11 max-sm:px-2"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {!hasDueDate && (
          <p className="text-sm text-secondary">
            <Link href={settingsHref} className="font-semibold text-brand-secondary hover:underline">
              Add your due date
            </Link>{" "}
            to see when completion discounts open.
          </p>
        )}

        {error && <p className="text-sm text-error-primary">{error}</p>}

        <div className="space-y-2.5">
          <Checkbox
            isSelected={emails}
            isReadOnly={saving}
            onChange={toggleEmails}
            label="Email me when a perk may be ready"
          />
          <p className="flex items-start gap-1.5 text-xs text-tertiary">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            We count gifts guests reserve on Regibee. Gifts bought straight from a store
            registry won&apos;t show here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
