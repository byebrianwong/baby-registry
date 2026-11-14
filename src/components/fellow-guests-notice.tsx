import { Users } from "lucide-react";
import { cx } from "@/lib/utils/cx";

/**
 * On a list a guest opened from an everyone-gives-everyone invitation: says
 * the names on the items are other guests', and that the list's owner can't
 * see them.
 */
export function FellowGuestsNotice({
  eventTitle,
  eventHref,
  ownerName,
  className,
}: {
  eventTitle: string;
  /** The event page, for everyone else's lists. */
  eventHref: string;
  /** Whose list it is: a guest's name, or the list's honoree. */
  ownerName: string | null;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start gap-3 rounded-2xl border border-mint-200 bg-mint-50 p-4", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
        <Users aria-hidden="true" className="h-4.5 w-4.5 text-mint-800" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-primary">You&apos;re shopping as a guest of {eventTitle}</p>
        <p className="text-secondary">
          You can see which of the other guests reserved what, so nobody doubles up.{" "}
          {ownerName ? `${ownerName} can't` : "The list's owner can't"} see who reserved what until the day after.{" "}
          <a href={eventHref} className="font-medium text-brand-600 hover:underline">
            Everyone&apos;s lists
          </a>
        </p>
      </div>
    </div>
  );
}
