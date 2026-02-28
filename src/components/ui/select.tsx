"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import {
  Select as AriaSelect,
  Button as AriaButton,
  SelectValue as AriaSelectValue,
  Popover as AriaPopover,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps as AriaListBoxItemProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"

// ---- Select (Root) ----

function Select({
  name,
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  disabled,
  required,
  ...props
}: {
  name?: string
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <AriaSelect
      name={name}
      defaultSelectedKey={defaultValue ?? undefined}
      selectedKey={value ?? undefined}
      onSelectionChange={
        onValueChange
          ? (key) => onValueChange(String(key))
          : undefined
      }
      isDisabled={disabled}
      isRequired={required}
      className={cn("flex flex-col gap-1.5", className)}
      {...(props as Omit<AriaSelectProps<object>, "children">)}
    >
      {children}
    </AriaSelect>
  )
}

// ---- SelectGroup ----

function SelectGroup({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="select-group" className={className} {...props}>
      {children}
    </div>
  )
}

// ---- SelectValue ----

function SelectValue({
  placeholder,
  className,
}: {
  placeholder?: string
  className?: string
}) {
  return (
    <AriaSelectValue
      data-slot="select-value"
      className={cn(
        "flex items-center gap-2 truncate data-[placeholder]:text-placeholder",
        className
      )}
    >
      {({ selectedText }) =>
        selectedText || (
          <span className="text-placeholder">{placeholder}</span>
        )
      }
    </AriaSelectValue>
  )
}

// ---- SelectTrigger ----

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"button"> & {
  size?: "sm" | "default"
}) {
  return (
    <AriaButton
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary whitespace-nowrap shadow-xs ring-1 ring-primary ring-inset transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:bg-disabled_subtle disabled:ring-disabled data-[size=default]:h-9 data-[size=sm]:h-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "focus-visible:ring-2 focus-visible:ring-brand",
        "aria-invalid:ring-error_subtle aria-invalid:focus-visible:ring-error",
        className
      )}
    >
      {children}
      <ChevronDownIcon className="size-4 text-fg-quaternary" />
    </AriaButton>
  )
}

// ---- SelectContent ----

function SelectContent({
  className,
  children,
  position,
  ...props
}: React.ComponentProps<"div"> & {
  position?: string
  align?: string
}) {
  return (
    <AriaPopover
      data-slot="select-content"
      className={(state) =>
        cn(
          "bg-primary text-primary z-50 min-w-[var(--trigger-width)] overflow-y-auto rounded-lg border border-secondary p-1 shadow-lg",
          state.isEntering &&
            "animate-in fade-in-0 zoom-in-95 duration-200",
          state.isExiting &&
            "animate-out fade-out-0 zoom-out-95 duration-200",
          className
        )
      }
    >
      <AriaListBox className="outline-none">{children}</AriaListBox>
    </AriaPopover>
  )
}

// ---- SelectLabel ----

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="select-label"
      className={cn("text-tertiary px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

// ---- SelectItem ----

function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: Omit<React.ComponentProps<"div">, "id"> & {
  value: string
  disabled?: boolean
}) {
  return (
    <AriaListBoxItem
      id={value}
      textValue={typeof children === "string" ? children : undefined}
      isDisabled={disabled}
      data-slot="select-item"
      className={(state) =>
        cn(
          "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm text-primary outline-hidden select-none",
          state.isFocused && "bg-active",
          state.isDisabled && "pointer-events-none opacity-50",
          typeof className === "string" ? className : undefined
        )
      }
    >
      {(state) => (
        <>
          <span className="absolute right-2 flex size-3.5 items-center justify-center">
            {state.isSelected && <CheckIcon className="size-4 text-fg-brand-primary" />}
          </span>
          {children}
        </>
      )}
    </AriaListBoxItem>
  )
}

// ---- SelectSeparator ----

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn(
        "bg-border-secondary pointer-events-none -mx-1 my-1 h-px",
        className
      )}
      {...props}
    />
  )
}

// ---- Scroll Buttons (stubs) ----

function SelectScrollUpButton(props: React.ComponentProps<"div">) {
  return null
}

function SelectScrollDownButton(props: React.ComponentProps<"div">) {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
