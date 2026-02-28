import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const baseStyles =
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-brand focus-visible:ring-brand/50 focus-visible:ring-[3px] aria-invalid:ring-error/20 dark:aria-invalid:ring-error/40 aria-invalid:border-error transition-[color,box-shadow] overflow-hidden"

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-brand-solid text-white [a&]:hover:bg-brand-solid/90",
  secondary:
    "bg-secondary text-secondary [a&]:hover:bg-secondary/90",
  destructive:
    "bg-error-600 text-white [a&]:hover:bg-error-600/90 focus-visible:ring-error/20 dark:focus-visible:ring-error/40",
  outline:
    "border-secondary text-primary [a&]:hover:bg-active [a&]:hover:text-primary",
  ghost: "[a&]:hover:bg-active [a&]:hover:text-primary",
  link: "text-brand-600 underline-offset-4 [a&]:hover:underline",
}

function badgeVariants({ variant = "default" }: { variant?: BadgeVariant } = {}) {
  return cn(baseStyles, variantStyles[variant])
}

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant
}) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
