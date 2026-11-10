// Occasion names, the same as the website's (occasionLabel in src/lib/registry-copy.ts).

import type { EventType, Registry } from "@/lib/types";

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "christmas", label: "Christmas" },
  { value: "wedding", label: "Wedding" },
  { value: "housewarming", label: "Housewarming" },
  { value: "graduation", label: "Graduation" },
  { value: "other", label: "Other" },
];

export function occasionLabel(registry: Pick<Registry, "registry_type" | "event_type">) {
  if ((registry.registry_type ?? "baby") === "baby") return "Baby registry";
  if (!registry.event_type || registry.event_type === "other") return "Wishlist";
  return EVENT_TYPES.find((option) => option.value === registry.event_type)?.label ?? "Wishlist";
}
