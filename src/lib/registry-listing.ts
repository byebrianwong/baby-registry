import type { Registry } from "./types";

// The only registry columns that public profiles read. Don't add `settings`
// here: it holds the owner's shipping address and payment handles.
export const LISTED_REGISTRY_COLUMNS =
  "slug, title, event_date, registry_type, event_type";

export type ListedRegistry = Pick<
  Registry,
  "slug" | "title" | "event_date" | "registry_type" | "event_type"
>;

export function isPastEvent(
  registry: Pick<Registry, "event_date">,
  today: string,
): boolean {
  return registry.event_date !== null && registry.event_date < today;
}

// Soonest events first, then registries with no date, then past events with the
// most recent first. `today` is a YYYY-MM-DD string, like `event_date`.
export function sortListedRegistries(
  registries: ListedRegistry[],
  today: string,
): ListedRegistry[] {
  const group = (registry: ListedRegistry) => {
    if (registry.event_date === null) return 1;
    return isPastEvent(registry, today) ? 2 : 0;
  };

  return [...registries].sort((a, b) => {
    const groupA = group(a);
    if (groupA !== group(b)) return groupA - group(b);
    if (a.event_date === null || b.event_date === null) {
      return a.title.localeCompare(b.title);
    }
    return groupA === 0
      ? a.event_date.localeCompare(b.event_date)
      : b.event_date.localeCompare(a.event_date);
  });
}
