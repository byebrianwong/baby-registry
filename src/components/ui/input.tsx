import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-primary placeholder:text-placeholder selection:bg-brand-100 selection:text-brand-900 h-9 w-full min-w-0 rounded-lg bg-primary px-3 py-2 text-base text-primary shadow-xs ring-1 ring-primary ring-inset transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:ring-disabled md:text-sm",
        "focus-visible:ring-2 focus-visible:ring-brand",
        "aria-invalid:ring-error_subtle aria-invalid:focus-visible:ring-error",
        className
      )}
      {...props}
    />
  )
}

export { Input }
