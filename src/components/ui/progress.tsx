import * as React from "react"

import { cn } from "@/lib/utils"

// A progressbar needs an accessible name, or screen readers announce only the
// percentage. Pass aria-label, or aria-labelledby pointing at a visible label.
type ProgressLabel =
  | { "aria-label": string; "aria-labelledby"?: never }
  | { "aria-labelledby": string; "aria-label"?: never }

function Progress({
  className,
  value,
  max = 100,
  ...props
}: Omit<React.ComponentProps<"div">, "aria-label" | "aria-labelledby"> &
  ProgressLabel & {
    value?: number
    max?: number
  }) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={value ?? undefined}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "bg-quaternary relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-mint-500 h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
}

export { Progress }
