import { ClipboardList } from "lucide-react";
import { formatSlotDate, spotsLabel, type GuestSignupRow } from "@/lib/signups";
import { cx } from "@/lib/utils/cx";

/** A sign-up sheet as the invitation shows it. */
export interface InvitationSignup {
  title: string;
  note: string | null;
  rows: GuestSignupRow[];
  /** A meal train: guests pick a day to help instead of coming to something. */
  mealTrain?: boolean;
}

/**
 * The sign-up sheet on the invitation: each row, how many spots are left, and
 * what people are bringing. Guests sign up in the RSVP form below it. Nobody
 * sees who took which spot except the hosts.
 */
export function SignupSheetSection({ signup }: { signup: InvitationSignup }) {
  return (
    <section aria-labelledby="signup-heading" className="flex flex-col gap-3 rounded-2xl bg-sunshine-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
          <ClipboardList aria-hidden="true" className="size-4.5 text-sunshine-900" />
        </span>
        <div className="min-w-0 pt-1">
          <h2 id="signup-heading" className="font-medium text-primary">
            {signup.title}
          </h2>
          {signup.note && <p className="mt-1 whitespace-pre-line text-secondary">{signup.note}</p>}
        </div>
      </div>
      {signup.rows.length === 0 ? (
        <p className="rounded-xl bg-primary p-3 text-sm text-tertiary">
          {signup.mealTrain ? "The host hasn't added days yet." : "The host hasn't added anything yet."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-secondary rounded-xl bg-primary">
          {signup.rows.map((row) => {
            const full = row.taken >= row.needed;
            return (
              <li key={row.id} className={cx("flex flex-col gap-0.5 px-3 py-2.5", row.passed && "opacity-60")}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 font-medium text-primary">
                    {row.slotDate && <span>{formatSlotDate(row.slotDate)} · </span>}
                    {row.label}
                    {row.mine && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">You</span>
                    )}
                  </p>
                  <span className={cx("shrink-0 text-sm", full ? "text-tertiary" : "font-medium text-mint-800")}>
                    {row.passed ? "Over" : spotsLabel(row)}
                  </span>
                </div>
                {(row.mine?.note || row.bringing.length > 0) && (
                  <p className="text-sm text-tertiary">
                    {[row.mine?.note ? `You: ${row.mine.note}` : null, ...row.bringing].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
