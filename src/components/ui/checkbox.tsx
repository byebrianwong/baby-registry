"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <span
      className={cn(
        "group/checkbox relative inline-grid size-4 shrink-0 place-content-center rounded-[4px] border border-input shadow-xs transition-shadow dark:bg-input/30",
        "has-[:checked]:bg-primary has-[:checked]:border-primary has-[:checked]:text-primary-foreground dark:has-[:checked]:bg-primary",
        "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
    >
      <input
        type="checkbox"
        data-slot="checkbox"
        className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 14 14"
        fill="none"
        className="pointer-events-none size-3.5 text-current opacity-0 peer-checked:opacity-100"
      >
        <path
          d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export { Checkbox }
