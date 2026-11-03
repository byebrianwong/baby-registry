"use client";

import type { ChangeEvent } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A native <select> renders its padding around the longest option, which
 * leaves awkward blank space between short selected labels and the chevron.
 * TightSelect sizes the visible pill to the current label by rendering it
 * in a sibling span and overlaying a transparent select on top for
 * interaction and a11y.
 */
export function TightSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  const current = options.find((o) => o.value === value)?.label ?? "";
  return (
    <span className="relative inline-flex items-center rounded-md border border-[#d5d7da] bg-primary py-1.5 pl-3 pr-8 text-sm focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
      <span className="pointer-events-none whitespace-nowrap">{current}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-tertiary" />
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value as T)
        }
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-transparent opacity-0 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
