"use client";

import Link, * as nextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/utils/cx";

// Storybook swaps next/link for a mock that has no useLinkStatus, so stories
// fall back to "never pending". In the app this is Next's own hook.
const useLinkStatus: () => { pending: boolean } =
  nextLink.useLinkStatus ?? (() => ({ pending: false }));

const TABS = [
  { href: "/dashboard", label: "My registries" },
  { href: "/dashboard/following", label: "Following" },
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
            "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600",
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
 * The My registries and Following tabs at the top of the dashboard. Each tab
 * is its own page with its own URL and data, but the tabs stay on screen while
 * you switch. Guests can't follow anyone, so they only get My registries.
 */
export function DashboardTabs({ showFollowing }: { showFollowing: boolean }) {
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
  const tabs = showFollowing ? TABS : TABS.slice(0, 1);

  return (
    <div className="container mx-auto px-4 pt-6">
      <nav aria-label="Dashboard">
        <ul className="flex gap-8 border-b border-secondary">
          {tabs.map((tab) => {
            const current = currentHref === tab.href;
            return (
              <li key={tab.href} className="flex max-sm:flex-1">
                <Link
                  href={tab.href}
                  onNavigate={() => setClickedHref(tab.href)}
                  aria-current={current ? "page" : undefined}
                  className={cx(
                    "relative flex min-h-12 w-full items-center justify-center font-display text-lg font-semibold outline-focus-ring transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 sm:justify-start",
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
