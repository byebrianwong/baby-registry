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
import { Button } from "@/components/ui/button"

// ---- Dialog Context ----

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
})

// ---- Dialog (Root) ----

function Dialog({
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
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

// ---- DialogTrigger ----

function DialogTrigger({
  asChild,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, onOpenChange } = React.useContext(DialogContext)

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
      data-slot="dialog-trigger"
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

// ---- DialogClose ----

function DialogClose({
  asChild,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DialogContext)

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
      data-slot="dialog-close"
      type="button"
      className={className}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  )
}

// ---- DialogContent ----

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: Omit<React.ComponentProps<"div">, "role"> & {
  showCloseButton?: boolean
}) {
  const { open, onOpenChange } = React.useContext(DialogContext)

  return (
    <AriaModalOverlay
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable
      className={(state) =>
        cn(
          "fixed inset-0 z-50 flex min-h-dvh w-full items-end justify-center overflow-y-auto bg-overlay/70 px-4 pt-4 pb-[clamp(16px,8vh,64px)] outline-hidden backdrop-blur-[6px] sm:items-center sm:justify-center sm:p-8",
          state.isEntering && "duration-300 ease-out animate-in fade-in",
          state.isExiting && "duration-200 ease-in animate-out fade-out"
        )
      }
    >
      <AriaModal
        className={(state) =>
          cn(
            "max-h-full w-full max-w-[calc(100%-2rem)] outline-hidden max-sm:overflow-y-auto max-sm:rounded-xl sm:max-w-lg",
            state.isEntering &&
              "duration-300 ease-out animate-in zoom-in-95",
            state.isExiting &&
              "duration-200 ease-in animate-out zoom-out-95"
          )
        }
      >
        <AriaDialog
          data-slot="dialog-content"
          className={cn(
            "bg-primary relative grid gap-4 rounded-lg border border-secondary p-6 shadow-lg outline-none",
            className
          )}
        >
          {children}
          {showCloseButton && (
            <CloseButton
              size="sm"
              className="absolute top-3 right-3"
              onPress={() => onOpenChange(false)}
            />
          )}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  )
}

// ---- Layout Components ----

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <AriaHeading
      slot="title"
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...(props as Record<string, unknown>)}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-tertiary text-sm", className)}
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return null
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
