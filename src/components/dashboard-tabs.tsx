"use client";

import Link, * as nextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/utils/cx";

// Storybook swaps next/link for a mock that has no useLinkStatus, so stories
// fall back to "never pending". In the app this is Next's own hook.
const useLinkStatus: () => { pending: boolean } =
  nextLink.useLinkStatus ?? (() => ({ pending: false }));

// Guests (anonymous sessions from reserving a gift) only get My registries.
// `inDemo: false` leaves a tab out of the demo (/demo), which has no page for it.
const TABS = [
  { href: "/dashboard", label: "My registries", accountOnly: false, inDemo: true },
  { href: "/dashboard/saved", label: "Saved", accountOnly: true, inDemo: false },
  { href: "/dashboard/events", label: "Events", accountOnly: true, inDemo: true },
  { href: "/dashboard/following", label: "Following", accountOnly: true, inDemo: true },
];

/**
 * One tab's label. The current tab is underlined. `pending` means you clicked
 * it and its page hasn't appeared yet, so the underline pulses to show the
 * click registered.
 */
function TabLabel({ label, current, pending }: { label: string; current: boolean; pending: boolean }) {
  return (
    <>
      {label}
      {current && (
        <span
          aria-hidden="true"
          className={cx(
            // A list that scrolls clips anything below it, so on phones the
            // underline sits just above the border instead of over it.
            "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600 max-sm:bottom-0",
            pending && "animate-pulse",
          )}
        />
      )}
    </>
  );
}

// useLinkStatus only works inside a <Link>, so it lives in a child component.
function TabStatus({ label, current }: { label: string; current: boolean }) {
  const { pending } = useLinkStatus();
  return <TabLabel label={label} current={current} pending={pending} />;
}

/**
 * The My registries, Saved, Events and Following tabs at the top of the
 * dashboard. Each tab is its own page with its own URL and data, but the tabs
 * stay on screen while you switch. Guests have no lists of their own, can't
 * plan events and can't follow anyone, so they only get My registries.
 */
export function DashboardTabs({
  hasAccount,
  basePath = "",
}: {
  hasAccount: boolean;
  /** Put in front of every tab's link. The demo passes "/demo". */
  basePath?: string;
}) {
  const pathname = usePathname() ?? "";

  // The tab you just clicked shows as current straight away, before the URL
  // changes. It's forgotten once the URL changes.
  const [clickedHref, setClickedHref] = useState<string | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setClickedHref(null);
  }
  const currentHref = clickedHref ?? pathname;
  const tabs = TABS.filter((tab) => (hasAccount || !tab.accountOnly) && (!basePath || tab.inDemo)).map((tab) => ({
    ...tab,
    href: `${basePath}${tab.href}`,
  }));

  return (
    <div className="container mx-auto px-4 pt-6">
      <nav aria-label="Dashboard">
        {/* On phones the four tabs share the width by the length of their
            labels, in a smaller size, so "My registries" stays on one line.
            A phone narrower than 360px scrolls them sideways. */}
        <ul className="scrollbar-hide flex gap-3 border-b border-secondary max-sm:overflow-x-auto sm:gap-8">
          {tabs.map((tab) => {
            const current = currentHref === tab.href;
            return (
              <li key={tab.href} className="flex max-sm:flex-auto">
                <Link
                  href={tab.href}
                  onNavigate={() => setClickedHref(tab.href)}
                  aria-current={current ? "page" : undefined}
                  className={cx(
                    "relative flex min-h-12 w-full items-center justify-center font-display text-[15px] font-semibold whitespace-nowrap outline-focus-ring sm:text-lg transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 sm:justify-start",
                    current ? "text-primary" : "text-tertiary hover:text-primary",
                  )}
                >
                  <TabStatus label={tab.label} current={current} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
