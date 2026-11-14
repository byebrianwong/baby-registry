import Link from "next/link";
import { Cake } from "lucide-react";
import { birthdayCountdown, formatBirthdayDate, sortBirthdays, type UpcomingBirthday } from "@/lib/gift-profile";
import { cx } from "@/lib/utils/cx";

/**
 * Birthdays in the next 30 days of people the viewer follows, who approved
 * them. Each one opens that person's wish list, or their profile when they
 * have several. Renders nothing when there are none.
 */
export function BirthdaysComingUp({
  birthdays,
  today,
  basePath = "",
}: {
  birthdays: UpcomingBirthday[];
  /** YYYY-MM-DD. */
  today: string;
  /** Put in front of every link. The demo passes "/demo". */
  basePath?: string;
}) {
  if (birthdays.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="birthdays-coming-up">
      <h2 id="birthdays-coming-up" className="text-lg font-semibold">
        Birthdays coming up
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {sortBirthdays(birthdays).map((birthday) => {
          const countdown = birthdayCountdown(birthday.date, today);
          const soon = countdown === "Today" || countdown === "Tomorrow";
          return (
            <li key={birthday.key}>
              <Link
                href={`${basePath}${birthday.href}`}
                className="group flex items-center gap-4 rounded-2xl border border-secondary bg-primary p-4 shadow-sm transition hover:border-primary hover:shadow-md motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600/10">
                  <Cake className="h-5 w-5 text-brand-600" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  {birthday.parentName && (
                    <span className="block break-words text-xs font-medium text-tertiary">
                      {birthday.parentName}&apos;s list
                    </span>
                  )}
                  <span className="block break-words font-medium text-primary group-hover:underline">
                    {birthday.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-tertiary">
                    {formatBirthdayDate(birthday.date)}
                    <span className="sr-only">. {birthday.linkTo === "list" ? "Opens their wish list" : "Opens their profile"}</span>
                  </span>
                </span>
                <span
                  className={cx(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    soon ? "bg-brand-solid text-white" : "bg-secondary text-secondary",
                  )}
                >
                  {countdown}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
