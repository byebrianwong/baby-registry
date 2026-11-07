"use client";

import {
  Cake,
  Check,
  ChevronDown,
  Gift,
  GraduationCap,
  Heart,
  Home,
  PartyPopper,
  TreePine,
  type LucideIcon,
} from "lucide-react";
import {
  Button as AriaButton,
  Label as AriaLabel,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Popover as AriaPopover,
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Text as AriaText,
} from "react-aria-components";
import { PERSONAL_EVENT_TYPE_OPTIONS } from "@/lib/registry-copy";
import type { PersonalEventType } from "@/lib/types";
import { cx } from "@/lib/utils/cx";

// The list's key for "no occasion". The form still sends an empty string.
const NONE = "none";

type OccasionKey = PersonalEventType | typeof NONE;

type Occasion = {
  id: OccasionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  // Background and icon color of the square tile.
  tile: string;
};

const DETAILS: Record<
  OccasionKey,
  Pick<Occasion, "description" | "icon" | "tile">
> = {
  none: {
    description: "A general wishlist",
    icon: Gift,
    tile: "bg-utility-gray-50 text-utility-gray-500",
  },
  birthday: {
    description: "A birthday or milestone year",
    icon: Cake,
    tile: "bg-utility-orange-50 text-utility-orange-500",
  },
  christmas: {
    description: "Holiday gifts for the season",
    icon: TreePine,
    tile: "bg-utility-green-50 text-utility-green-600",
  },
  wedding: {
    description: "A wedding or engagement",
    icon: Heart,
    tile: "bg-utility-pink-50 text-utility-pink-500",
  },
  housewarming: {
    description: "A new home or a move",
    icon: Home,
    tile: "bg-utility-yellow-50 text-utility-yellow-600",
  },
  graduation: {
    description: "Finishing school or a degree",
    icon: GraduationCap,
    tile: "bg-utility-blue-50 text-utility-blue-500",
  },
  other: {
    description: "Any other celebration",
    icon: PartyPopper,
    tile: "bg-utility-purple-50 text-utility-purple-500",
  },
};

const OCCASIONS: Occasion[] = [
  { id: NONE, label: "No specific occasion", ...DETAILS.none },
  ...PERSONAL_EVENT_TYPE_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    ...DETAILS[option.value],
  })),
];

function OccasionTile({
  occasion,
  size,
}: {
  occasion: Occasion;
  size: "sm" | "md";
}) {
  const Icon = occasion.icon;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center",
        size === "sm" ? "size-10 rounded-lg" : "size-12 rounded-xl",
        occasion.tile,
      )}
    >
      <Icon className={size === "sm" ? "size-5" : "size-6"} strokeWidth={1.75} />
    </span>
  );
}

interface OccasionPickerProps {
  value: PersonalEventType | "";
  onChange: (value: PersonalEventType | "") => void;
  label?: string;
  hint?: string;
  // Opens the list on first render. Used by the Storybook story.
  defaultOpen?: boolean;
}

/**
 * Picks the occasion for a personal registry. Each choice shows an icon tile,
 * a name and a short description. Built on react-aria's Select, so it works
 * with the keyboard and screen readers like a native select.
 *
 * It does not post a form value itself. Pair it with a hidden input.
 */
export function OccasionPicker({
  value,
  onChange,
  label = "Occasion (optional)",
  hint,
  defaultOpen,
}: OccasionPickerProps) {
  return (
    <AriaSelect
      selectedKey={value || NONE}
      onSelectionChange={(key) =>
        onChange(key === NONE || key == null ? "" : (key as PersonalEventType))
      }
      defaultOpen={defaultOpen}
      className="flex flex-col gap-1.5"
    >
      <AriaLabel className="text-sm font-medium text-secondary">{label}</AriaLabel>

      <AriaButton
        className={({ isFocusVisible, isPressed }) =>
          cx(
            "flex w-full cursor-pointer items-center gap-3 rounded-xl bg-primary p-2 pr-3 text-left shadow-xs ring-1 ring-primary outline-hidden transition ring-inset",
            "hover:bg-primary_hover",
            (isFocusVisible || isPressed) && "ring-2 ring-[#004659]",
          )
        }
      >
        <AriaSelectValue<Occasion> className="flex min-w-0 flex-1 items-center gap-3">
          {({ selectedItem }) => {
            const occasion = selectedItem ?? OCCASIONS[0];
            return (
              <>
                <OccasionTile occasion={occasion} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-primary">
                    {occasion.label}
                  </span>
                  <span className="truncate text-xs text-tertiary">
                    {occasion.description}
                  </span>
                </span>
              </>
            );
          }}
        </AriaSelectValue>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
      </AriaButton>

      {hint && <p className="text-xs text-tertiary">{hint}</p>}

      <AriaPopover
        placement="bottom start"
        offset={6}
        className={({ isEntering, isExiting }) =>
          cx(
            "max-h-96 w-(--trigger-width) overflow-y-auto rounded-2xl bg-primary p-2 shadow-xl ring-1 ring-secondary_alt outline-hidden",
            isEntering && "duration-150 ease-out animate-in fade-in slide-in-from-top-1",
            isExiting && "duration-100 ease-in animate-out fade-out",
          )
        }
      >
        <AriaListBox items={OCCASIONS} className="flex flex-col gap-0.5 outline-hidden">
          {(occasion) => (
            <AriaListBoxItem
              id={occasion.id}
              textValue={occasion.label}
              className={({ isFocused, isSelected, isFocusVisible }) =>
                cx(
                  "flex cursor-pointer items-center gap-4 rounded-xl p-2 outline-hidden select-none",
                  isSelected && "bg-active",
                  isFocused && !isSelected && "bg-primary_hover",
                  isFocusVisible && "ring-2 ring-[#004659] ring-inset",
                )
              }
            >
              {({ isSelected }) => (
                <>
                  <OccasionTile occasion={occasion} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <AriaText slot="label" className="text-sm font-medium text-primary">
                      {occasion.label}
                    </AriaText>
                    <AriaText slot="description" className="text-sm text-tertiary">
                      {occasion.description}
                    </AriaText>
                  </span>
                  {isSelected && (
                    <Check aria-hidden="true" className="size-4 shrink-0 text-[#004659]" />
                  )}
                </>
              )}
            </AriaListBoxItem>
          )}
        </AriaListBox>
      </AriaPopover>
    </AriaSelect>
  );
}
