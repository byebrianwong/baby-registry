import Link from "next/link";
import { EyeOff } from "lucide-react";
import { cx } from "@/lib/utils/cx";

/** When the owner's hidden gifts are revealed, from the events the list is linked to. */
export interface RevealInfo {
  /** Some gifts are revealed already: the ones reserved before the last event. */
  revealedCount?: number;
  /** The next reveal: "Dec 26", the day after the event. */
  next?: { date: string; eventTitle: string } | null;
}

/**
 * Tells a list's owner that what's been reserved is hidden from them, and
 * where to change it. Shown on the owner's registry page, its Gift Activity
 * tab and its public page while the owner is the one looking.
 */
export function ReservationsHiddenNotice({
  settingsHref,
  turnedOnByExchange = false,
  reveal,
  className,
}: {
  /** The registry's settings page. Left out on pages with no settings link. */
  settingsHref?: string;
  /** Regibee turned it on because the owner added the list to a gift exchange. */
  turnedOnByExchange?: boolean;
  /** When gifts are revealed. Left out on lists not linked to an event. */
  reveal?: RevealInfo;
  className?: string;
}) {
  const revealed = reveal?.revealedCount ?? 0;
  return (
    <div className={cx("flex items-start gap-3 rounded-2xl bg-secondary p-4", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
        <EyeOff aria-hidden="true" className="h-4.5 w-4.5 text-tertiary" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-primary">
          {revealed > 0 ? "New reservations are hidden from you" : "What's been reserved is hidden from you"}
        </p>
        {revealed > 0 && (
          <p className="text-secondary">
            {revealed === 1 ? "1 gift from your last event is" : `${revealed} gifts from your last event are`} revealed
            below, with who gave {revealed === 1 ? "it" : "them"}, for your thank-you notes.
          </p>
        )}
        {reveal?.next && (
          <p className="text-secondary">
            Gifts reserved before {reveal.next.eventTitle} are revealed on {reveal.next.date}, the day after.
          </p>
        )}
        <p className="text-tertiary">
          {turnedOnByExchange
            ? "Regibee hid it when you added this list to a gift exchange, so your gifts stay a surprise. "
            : "Your gifts stay a surprise. "}
          Guests still see what&apos;s taken, so nobody buys the same thing twice.
          {settingsHref && (
            <>
              {" "}
              <Link href={settingsHref} className="font-medium text-brand-600 hover:underline">
                Change this in settings
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
