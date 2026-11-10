"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ReserveItemDialog,
  type GiftActions,
  type ReserveItemDialogProps,
} from "@/components/reserve-item-dialog";
import { formatReservedUntil, type MyItemGift } from "@/lib/gifts";

// Shown at the top of a registry to a guest with a reservation they haven't
// confirmed, so coming back from the store, or the next day, they don't have
// to find the item to finish. Each reservation gets its own dialog here, so
// it works even when filters hide the item's card.

export interface ReservationBannerEntry {
  item: ReserveItemDialogProps["item"];
  gift: MyItemGift;
  registryStoreName?: string;
  storeName?: string;
  /** The demo passes its own. */
  actions?: Partial<GiftActions>;
}

interface ReservationBannerProps {
  entries: ReservationBannerEntry[];
  parentName: string;
  shippingAddress?: string;
  /** Spacing below the banner. Defaults to mb-6. */
  className?: string;
}

export function ReservationBanner({
  entries,
  parentName,
  shippingAddress,
  className = "mb-6",
}: ReservationBannerProps) {
  // Keep each dialog mounted after its reservation is confirmed or released,
  // so its thank-you step stays on screen when the page refreshes and the
  // banner for it goes away.
  const [seen, setSeen] = useState(entries);
  const entryKey = entries.map((e) => e.gift.purchaseId).join(",");
  useEffect(() => {
    setSeen((prev) => {
      const ids = new Set(prev.map((e) => e.item.id));
      return [...prev, ...entries.filter((e) => !ids.has(e.item.id))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryKey]);

  const current = new Map(entries.map((e) => [e.item.id, e]));
  if (seen.length === 0) return null;

  return (
    // Hidden, not removed, once nothing is open: finished dialogs stay mounted.
    <div hidden={current.size === 0} className={`flex flex-col gap-3 ${className}`}>
      {seen.map((entry) => {
        const live = current.get(entry.item.id);
        // Same elements whether or not the reservation is still open, so the
        // dialog inside stays mounted. A finished one is just hidden.
        return (
          <section
            key={entry.item.id}
            hidden={!live}
            aria-label="Your reservation"
            className="flex flex-col gap-3 rounded-2xl border border-sunshine-200 bg-sunshine-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            {live ? (
              <div className="flex min-w-0 items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold text-primary">You reserved the {entry.item.title}</p>
                  <p className="text-sm text-secondary">
                    {live.gift.reservedUntil ? (
                      <>
                        It&apos;s held for you until{" "}
                        <span suppressHydrationWarning>{formatReservedUntil(live.gift.reservedUntil)}</span>.{" "}
                      </>
                    ) : null}
                    Did you buy it?
                  </p>
                </div>
              </div>
            ) : null}
            <ReserveItemDialog
              item={entry.item}
              gift={live?.gift ?? entry.gift}
              parentName={parentName}
              shippingAddress={shippingAddress}
              registryStoreName={entry.registryStoreName}
              storeName={entry.storeName}
              actions={entry.actions}
              renderTrigger={({ openAt, confirmNow, busy }) =>
                live ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <Button onClick={confirmNow} disabled={busy}>
                      {busy ? "Saving..." : "Yes, I bought it"}
                    </Button>
                    <Button variant="outline" onClick={() => openAt("buy")}>
                      Buy it now
                    </Button>
                    <button
                      type="button"
                      className="text-sm font-medium text-error-primary underline-offset-2 hover:underline"
                      onClick={() => openAt("release")}
                    >
                      Release
                    </button>
                  </div>
                ) : null
              }
            />
          </section>
        );
      })}
    </div>
  );
}
