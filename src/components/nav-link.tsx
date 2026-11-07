"use client";

import Link, { useLinkStatus } from "next/link";
import { cx } from "@/lib/utils/cx";

/**
 * The text of one link in the top bar.
 *
 * `current` marks the page you are on, or the one you just clicked.
 * `pending` means you clicked it and the next page hasn't appeared yet. A
 * pulsing line under the label shows the click registered.
 */
export function NavLinkLabel({
  label,
  current,
  pending,
}: {
  label: string;
  current: boolean;
  pending: boolean;
}) {
  return (
    <span
      className={cx(
        "relative inline-block transition-colors group-hover:text-primary",
        current ? "font-medium text-primary" : "text-tertiary",
      )}
    >
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
function NavLinkStatus({ label, current }: { label: string; current: boolean }) {
  const { pending } = useLinkStatus();
  return <NavLinkLabel label={label} current={current || pending} pending={pending} />;
}

export function NavLink({
  href,
  label,
  current,
  onNavigate,
}: {
  href: string;
  label: string;
  current: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onNavigate={onNavigate}
      aria-current={current ? "page" : undefined}
      className="group text-sm"
    >
      <NavLinkStatus label={label} current={current} />
    </Link>
  );
}
