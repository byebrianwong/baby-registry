"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import {
  Dialog as AriaDialog,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from "react-aria-components"

import { cn } from "@/lib/utils"
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
          "fixed inset-0 z-50 bg-black/50",
          state.isEntering && "animate-in fade-in-0 duration-200",
          state.isExiting && "animate-out fade-out-0 duration-200"
        )
      }
    >
      <AriaModal
        className={(state) =>
          cn(
            "fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] outline-none sm:max-w-lg",
            state.isEntering &&
              "animate-in fade-in-0 zoom-in-95 duration-200",
            state.isExiting &&
              "animate-out fade-out-0 zoom-out-95 duration-200"
          )
        }
      >
        <AriaDialog
          data-slot="dialog-content"
          className={cn(
            "bg-background relative grid gap-4 rounded-lg border p-6 shadow-lg outline-none",
            className
          )}
        >
          {children}
          {showCloseButton && (
            <button
              data-slot="dialog-close"
              type="button"
              className="ring-offset-background focus:ring-ring absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              onClick={() => onOpenChange(false)}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </button>
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
      className={cn("text-muted-foreground text-sm", className)}
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
