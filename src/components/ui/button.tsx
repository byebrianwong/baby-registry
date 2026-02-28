"use client"

import * as React from "react"
import {
  Button as UntitledButton,
  type ButtonProps as UntitledButtonProps,
  type Props as UntitledProps,
  styles as untitledStyles,
} from "@/components/base/buttons/button"
import { cn } from "@/lib/utils"
import { cx } from "@/lib/utils/cx"

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

const variantMap: Record<ButtonVariant, UntitledProps["color"]> = {
  default: "primary",
  destructive: "primary-destructive",
  outline: "secondary",
  secondary: "secondary",
  ghost: "tertiary",
  link: "link-color",
}

const sizeMap: Record<ButtonSize, UntitledProps["size"]> = {
  default: "sm",
  xs: "sm",
  sm: "sm",
  lg: "md",
  icon: "sm",
  "icon-xs": "sm",
  "icon-sm": "sm",
  "icon-lg": "md",
}

// Extra size overrides not covered by Untitled UI sizes
const sizeOverrides: Partial<Record<ButtonSize, string>> = {
  xs: "!h-6 !gap-1 !rounded-md !px-2 !text-xs !py-0 [&_svg:not([class*='size-'])]:!size-3",
  "icon-xs": "!size-6 !rounded-md !p-0 [&_svg:not([class*='size-'])]:!size-3",
}

/**
 * Generate button class names without rendering (for use with asChild on non-button elements)
 */
function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  const utColor = variantMap[variant]
  const utSize = sizeMap[size]
  const isIconSize = size === "icon" || size === "icon-xs" || size === "icon-sm" || size === "icon-lg"
  return cx(
    untitledStyles.common.root,
    untitledStyles.sizes[utSize!].root,
    untitledStyles.colors[utColor!].root,
    isIconSize && "aspect-square p-0",
    sizeOverrides[size],
    className,
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}) {
  const utColor = variantMap[variant]
  const utSize = sizeMap[size]
  const isIconSize = size === "icon" || size === "icon-xs" || size === "icon-sm" || size === "icon-lg"

  // asChild: extract href from Link child and pass to Untitled UI Button's href prop
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>
    const href = childProps.href as string | undefined

    if (href) {
      // Render as Untitled UI link-button using href
      const childChildren = childProps.children as React.ReactNode
      return (
        <UntitledButton
          href={href}
          color={utColor}
          size={utSize}
          isDisabled={disabled}
          className={cn(
            isIconSize && "aspect-square p-0",
            sizeOverrides[size],
            className,
          )}
        >
          {childChildren}
        </UntitledButton>
      )
    }

    // Non-link asChild: clone the child with button styles
    const classes = buttonVariants({ variant, size, className })
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      "data-slot": "button",
      className: cn(classes, childProps.className as string | undefined),
    } as Record<string, unknown>)
  }

  // Regular button rendering via Untitled UI Button
  const { type = "button", onClick, ...rest } = props
  return (
    <UntitledButton
      color={utColor}
      size={utSize}
      isDisabled={disabled}
      type={type}
      className={cn(
        isIconSize && "aspect-square p-0",
        sizeOverrides[size],
        className,
      )}
      onClick={onClick as UntitledButtonProps["onClick"]}
      {...(rest as Omit<UntitledButtonProps, "color" | "size" | "isDisabled" | "type" | "onClick" | "className">)}
    >
      {children}
    </UntitledButton>
  )
}

export { Button, buttonVariants }
