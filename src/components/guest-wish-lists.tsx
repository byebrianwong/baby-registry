import { ExternalLink, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialsFor } from "@/lib/initials";
import type { GuestWishList } from "@/lib/events";
import { cx } from "@/lib/utils/cx";

export interface GuestWishListsProps {
  lists: GuestWishList[];
  /**
   * The event's slug and the guest's RSVP token. With both, a Regibee list's
   * button goes through the event's gift link, so the list knows who the
   * guest is and shows them what the other guests reserved.
   */
  eventSlug?: string;
  guestToken?: string | null;
  /** Guests who haven't answered yet, so they aren't on the list. */
  waitingCount?: number;
  /** A host looking at it without being a guest: no "You" row to point at. */
  hostView?: boolean;
}

/** "store.com" from a link, for a list that isn't on Regibee. */
function storeName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Another store";
  }
}

/**
 * Everyone's wish lists, on an everyone-gives-everyone invitation. Only the
 * event's guests and hosts see it. A guest's own list is first, without a
 * button to shop it: nobody sees what's been reserved from their own list.
 */
export function GuestWishLists({
  lists,
  eventSlug,
  guestToken,
  waitingCount = 0,
  hostView = false,
}: GuestWishListsProps) {
  const hrefFor = (slug: string) =>
    eventSlug && guestToken
      ? `/e/${eventSlug}/gifts?g=${encodeURIComponent(guestToken)}&to=${encodeURIComponent(slug)}`
      : `/r/${slug}`;
  const withList = lists.filter((l) => l.url).length;
  return (
    <section aria-labelledby="wish-lists-heading" className="flex flex-col gap-4 rounded-2xl bg-mint-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
          <Users aria-hidden="true" className="size-4.5 text-mint-800" />
        </span>
        <div className="min-w-0 pt-1">
          <h2 id="wish-lists-heading" className="font-medium text-primary">
            Everyone&apos;s wish lists
          </h2>
          <p className="mt-1 text-sm text-secondary">
            {hostView
              ? "Guests see these lists, and what the other guests reserved from each one."
              : "Open a list to see what the others reserved from it, so nobody doubles up. Nobody sees what's been reserved from their own list."}
          </p>
        </div>
      </div>

      {lists.length === 0 ? (
        <p className="rounded-xl bg-primary p-3 text-sm text-tertiary">
          Nobody has RSVPed yet. Lists show here as guests add them.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.map((entry) => {
            const isRegibee = Boolean(entry.registry);
            const href = entry.registry ? hrefFor(entry.registry.slug) : entry.url;
            return (
              <li
                key={entry.guestId}
                className="flex flex-col gap-3 rounded-xl bg-primary p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      entry.isYou ? "bg-brand-600 text-white" : "bg-mint-200 text-mint-900",
                    )}
                  >
                    {initialsFor(entry.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium break-words text-primary">
                      {entry.name}
                      {entry.isYou && <span className="ml-1.5 text-sm font-normal text-tertiary">(you)</span>}
                    </p>
                    <p className="text-sm break-words text-tertiary">
                      {entry.registry
                        ? entry.registry.title
                        : entry.url
                          ? `A list on ${storeName(entry.url)}`
                          : entry.isYou
                            ? "Add your wish list in your RSVP"
                            : "No wish list yet"}
                    </p>
                    {entry.giftIdeas && (
                      <p className="mt-1 text-sm whitespace-pre-line text-secondary">
                        <Gift aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px] text-tertiary" />
                        {entry.giftIdeas}
                      </p>
                    )}
                  </div>
                </div>
                {href && !entry.isYou && (
                  <Button variant="outline" size="sm" className="shrink-0 max-sm:min-h-11" asChild>
                    <a
                      href={href}
                      {...(isRegibee ? {} : { target: "_blank", rel: "noopener noreferrer nofollow" })}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        See {entry.name.split(/\s+/)[0]}&apos;s list
                        {!isRegibee && <ExternalLink aria-hidden="true" className="size-3.5" />}
                      </span>
                    </a>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(waitingCount > 0 || (lists.length > 0 && withList < lists.length)) && (
        <p className="text-xs text-tertiary">
          {[
            lists.length > 0 && withList < lists.length
              ? `${lists.length - withList} of ${lists.length} ${lists.length - withList === 1 ? "hasn't" : "haven't"} added a list yet.`
              : null,
            waitingCount > 0
              ? `${waitingCount === 1 ? "1 guest hasn't" : `${waitingCount} guests haven't`} answered yet.`
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>
      )}
    </section>
  );
}
