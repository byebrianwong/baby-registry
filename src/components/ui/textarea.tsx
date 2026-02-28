import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-placeholder flex field-sizing-content min-h-16 w-full rounded-lg bg-primary px-3 py-2 text-base text-primary shadow-xs ring-1 ring-primary ring-inset transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:ring-disabled md:text-sm",
        "focus-visible:ring-2 focus-visible:ring-brand",
        "aria-invalid:ring-error_subtle aria-invalid:focus-visible:ring-error",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
