import * as React from "react"

import { cn } from "@/lib/utils"

/** A gray block that pulses in place of content that is still loading. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-quaternary", className)}
      {...props}
    />
  )
}

export { Skeleton }
