"use client";

import Link, * as nextLink from "next/link";
import { cx } from "@/lib/utils/cx";

// Storybook swaps next/link for a mock that has no useLinkStatus, so stories
// fall back to "never pending". In the app this is Next's own hook.
const useLinkStatus: () => { pending: boolean } =
  nextLink.useLinkStatus ?? (() => ({ pending: false }));

/** "bar" is the row of links in the desktop header, "tab" the full-width tabs on phones. */
export type NavLinkVariant = "bar" | "tab";

/**
 * Classes for one top-bar link. `current` marks the page you are on, or the
 * one you just clicked.
 */
export function navLinkClassName(variant: NavLinkVariant, current: boolean) {
  return variant === "bar"
    ? cx(
        "rounded-md px-3 py-2 text-sm font-medium outline-focus-ring transition-colors focus-visible:outline-2",
        current ? "bg-secondary text-primary" : "text-tertiary hover:bg-secondary hover:text-primary",
      )
    : cx(
        "-mb-px flex min-h-11 items-center justify-center border-b-2 text-sm font-medium outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        current ? "border-[#004659] text-primary" : "border-transparent text-tertiary",
      );
}

/**
 * The label of one top-bar link. `pending` means you clicked it and the next
 * page hasn't appeared yet. A pulsing line under the label shows the click
 * registered.
 */
export function NavLinkLabel({ label, pending }: { label: string; pending: boolean }) {
  return (
    <span className="relative inline-block">
      {label}
      {pending && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-1 h-0.5 animate-pulse rounded-full bg-brand-600"
        />
      )}
    </span>
  );
}

// useLinkStatus only works inside a <Link>, so it lives in a child component.
function NavLinkStatus({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <NavLinkLabel label={label} pending={pending} />;
}

export function NavLink({
  href,
  label,
  variant,
  current,
  onNavigate,
}: {
  href: string;
  label: string;
  variant: NavLinkVariant;
  current: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onNavigate={onNavigate}
      aria-current={current ? "page" : undefined}
      className={navLinkClassName(variant, current)}
    >
      <NavLinkStatus label={label} />
    </Link>
  );
}
