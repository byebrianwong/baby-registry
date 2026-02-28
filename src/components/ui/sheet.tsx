"use client"

import * as React from "react"
import {
  Dialog as AriaDialog,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from "react-aria-components"

import { cn } from "@/lib/utils"
import { CloseButton } from "@/components/base/buttons/close-button"

// ---- Sheet Context ----

interface SheetContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
})

// ---- Sheet (Root) ----

function Sheet({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange: controlledOnOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  modal?: boolean
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const onOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value)
      controlledOnOpenChange?.(value)
    },
    [isControlled, controlledOnOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

// ---- SheetTrigger ----

function SheetTrigger({
  asChild,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, onOpenChange } = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>
    const childOnClick = childProps.onClick as ((e: React.MouseEvent) => void) | undefined
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: (e: React.MouseEvent) => {
        onOpenChange(!open)
        childOnClick?.(e)
      },
      "aria-haspopup": "dialog",
      "aria-expanded": open,
    } as Record<string, unknown>)
  }

  return (
    <button
      data-slot="sheet-trigger"
      className={className}
      onClick={() => onOpenChange(!open)}
      aria-haspopup="dialog"
      aria-expanded={open}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

// ---- SheetClose ----

function SheetClose({
  asChild,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>
    const childOnClick = childProps.onClick as ((e: React.MouseEvent) => void) | undefined
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: (e: React.MouseEvent) => {
        onOpenChange(false)
        childOnClick?.(e)
      },
    } as Record<string, unknown>)
  }

  return (
    <button
      data-slot="sheet-close"
      type="button"
      className={className}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  )
}

// ---- SheetContent ----

const sideStyles = {
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
  left:
    "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b",
  bottom: "inset-x-0 bottom-0 h-auto border-t",
}

const sideEnterStyles = {
  right: "slide-in-from-right",
  left: "slide-in-from-left",
  top: "slide-in-from-top",
  bottom: "slide-in-from-bottom",
}

const sideExitStyles = {
  right: "slide-out-to-right",
  left: "slide-out-to-left",
  top: "slide-out-to-top",
  bottom: "slide-out-to-bottom",
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Omit<React.ComponentProps<"div">, "role"> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const { open, onOpenChange } = React.useContext(SheetContext)

  return (
    <AriaModalOverlay
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable
      className={(state) =>
        cn(
          "fixed inset-0 z-50 flex min-h-dvh w-full bg-overlay/70 outline-hidden ease-linear",
          side === "right" && "items-center justify-end pl-6 md:pl-10",
          side === "left" && "items-center justify-start pr-6 md:pr-10",
          side === "top" && "items-start justify-center pb-6",
          side === "bottom" && "items-end justify-center pt-6",
          state.isEntering && "duration-300 animate-in fade-in",
          state.isExiting && "duration-300 animate-out fade-out"
        )
      }
    >
      <AriaModal
        className={(state) =>
          cn(
            "bg-primary shadow-xl outline-none transition",
            sideStyles[side],
            state.isEntering &&
              `duration-300 animate-in ${sideEnterStyles[side]}`,
            state.isExiting &&
              `duration-300 animate-out ${sideExitStyles[side]}`
          )
        }
      >
        <AriaDialog
          data-slot="sheet-content"
          className="relative flex size-full flex-col gap-4 overflow-y-auto bg-primary ring-1 ring-secondary_alt outline-none"
        >
          {children}
          {showCloseButton && (
            <CloseButton
              size="sm"
              className="absolute top-3 right-3 shrink-0"
              onPress={() => onOpenChange(false)}
            />
          )}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  )
}

// ---- Layout Components ----

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4 shadow-[inset_0px_1px_0px_0px] shadow-border-secondary", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <AriaHeading
      slot="title"
      data-slot="sheet-title"
      className={cn("text-primary font-semibold", className)}
      {...(props as Record<string, unknown>)}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-tertiary text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
