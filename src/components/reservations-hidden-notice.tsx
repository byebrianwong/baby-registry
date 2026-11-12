import Link from "next/link";
import { EyeOff } from "lucide-react";
import { cx } from "@/lib/utils/cx";

/**
 * Tells a list's owner that what's been reserved is hidden from them, and
 * where to change it. Shown on the owner's registry page, its Gift Activity
 * tab and its public page while the owner is the one looking.
 */
export function ReservationsHiddenNotice({
  settingsHref,
  turnedOnByExchange = false,
  className,
}: {
  /** The registry's settings page. Left out on pages with no settings link. */
  settingsHref?: string;
  /** Regibee turned it on because the owner added the list to a gift exchange. */
  turnedOnByExchange?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start gap-3 rounded-2xl bg-secondary p-4", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
        <EyeOff aria-hidden="true" className="h-4.5 w-4.5 text-tertiary" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-primary">What&apos;s been reserved is hidden from you</p>
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
