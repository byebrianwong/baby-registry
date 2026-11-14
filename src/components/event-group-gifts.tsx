import Link from "next/link";
import { Users } from "lucide-react";
import { ItemImage } from "@/components/item-image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { groupGiftPath, groupGiftProgress, type EventGroupGift } from "@/lib/group-gifts";
import { formatAmount as money } from "@/lib/money";

/**
 * Group gifts started from this event, on a guest's own invitation link, so
 * other guests can chip in. Gifts for the guest's own lists are left out by
 * the page.
 */
export function EventGroupGifts({ gifts }: { gifts: EventGroupGift[] }) {
  if (gifts.length === 0) return null;
  return (
    <section aria-labelledby="event-group-gifts-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="event-group-gifts-heading" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Users aria-hidden="true" className="size-5" />
          Group gifts
        </h2>
        <p className="text-sm text-secondary">Guests are going in on these together. Chip in if you&apos;d like.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {gifts.map((gift) => {
          const { percent, toGo } = groupGiftProgress(gift.pledged, gift.goalAmount);
          const progressId = `group-gift-${gift.token}`;
          return (
            <li key={gift.token} className="flex flex-col gap-3 rounded-2xl border border-secondary bg-primary p-4">
              <div className="flex gap-3">
                <ItemImage imageUrl={gift.imageUrl} title={gift.itemTitle} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words text-primary">{gift.itemTitle}</p>
                  <p className="text-sm text-tertiary">
                    For {gift.recipientName} · started by {gift.organizerName}
                  </p>
                  <p id={progressId} className="mt-1 text-sm text-secondary">
                    <span className="font-semibold text-primary">{money(gift.pledged)}</span>
                    {gift.goalAmount ? ` of ${money(gift.goalAmount)}` : " pledged"}
                    {gift.pledgeCount > 0 && ` from ${gift.pledgeCount} ${gift.pledgeCount === 1 ? "person" : "people"}`}
                    {gift.status === "bought" ? " · bought" : gift.goalAmount && toGo > 0 ? ` · ${money(toGo)} to go` : ""}
                  </p>
                </div>
              </div>
              {gift.goalAmount ? <Progress aria-labelledby={progressId} value={percent} /> : null}
              <Button variant="outline" className="self-start max-sm:w-full" asChild>
                <Link href={groupGiftPath(gift.token)}>
                  {gift.status === "bought" ? "See the group gift" : "Chip in"}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
