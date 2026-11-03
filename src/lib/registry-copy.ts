import type { PersonalEventType, Registry, RegistryType } from "./types";

export interface RegistryCopy {
  registryNoun: string;
  registryNounPlural: string;
  eventDateLabel: string;
  eventDatePlaceholderHint: string;
  honoreeLabel: string;
  honoreePlaceholder: string;
  titlePlaceholder: string;
  tagline: string;
  selfPurchasedLabel: string;
  selfPurchaseButton: string;
  coverItemFlavor: (honoree: string) => string;
  emailFooterLine: string;
  checklistAvailable: boolean;
}

const BABY: RegistryCopy = {
  registryNoun: "baby registry",
  registryNounPlural: "baby registries",
  eventDateLabel: "Due Date",
  eventDatePlaceholderHint:
    "Used for personalized recommendations and reminders",
  honoreeLabel: "Parent Names",
  honoreePlaceholder: 'e.g., "Denise & Brian"',
  titlePlaceholder: "The Smith Family Baby Registry",
  tagline: "Set up your baby registry in just a few steps",
  selfPurchasedLabel: "Purchased by parent",
  selfPurchaseButton: "Mark as bought by parent",
  coverItemFlavor: (honoree) =>
    `${honoree} found a deal for this one and now it's on its way to baby.`,
  emailFooterLine:
    "You're receiving this because someone interacted with your baby registry.",
  checklistAvailable: true,
};

const PERSONAL_DEFAULTS: RegistryCopy = {
  registryNoun: "registry",
  registryNounPlural: "registries",
  eventDateLabel: "Event Date",
  eventDatePlaceholderHint: "Optional — when's the big day?",
  honoreeLabel: "Honoree",
  honoreePlaceholder: 'e.g., "Alex & Sam"',
  titlePlaceholder: "Alex's Wishlist",
  tagline: "Set up your registry in just a few steps",
  selfPurchasedLabel: "Already bought",
  selfPurchaseButton: "Mark as already bought",
  coverItemFlavor: (honoree) =>
    `${honoree} found a deal for this one and now it's on its way.`,
  emailFooterLine:
    "You're receiving this because someone interacted with your registry.",
  checklistAvailable: false,
};

const PERSONAL_OVERRIDES: Record<PersonalEventType, Partial<RegistryCopy>> = {
  birthday: {
    eventDateLabel: "Birthday",
    honoreeLabel: "Birthday Person",
    honoreePlaceholder: 'e.g., "Alex"',
    titlePlaceholder: "Alex's 30th Birthday",
    tagline: "Set up your birthday wishlist in just a few steps",
  },
  christmas: {
    eventDateLabel: "Celebration Date",
    honoreeLabel: "Household",
    honoreePlaceholder: 'e.g., "The Chen Family"',
    titlePlaceholder: "The Chen Family Christmas",
    tagline: "Set up your Christmas list in just a few steps",
  },
  wedding: {
    eventDateLabel: "Wedding Date",
    honoreeLabel: "Couple",
    honoreePlaceholder: 'e.g., "Alex & Sam"',
    titlePlaceholder: "Alex & Sam's Wedding Registry",
    tagline: "Set up your wedding registry in just a few steps",
    registryNoun: "wedding registry",
  },
  housewarming: {
    eventDateLabel: "Housewarming Date",
    honoreeLabel: "Household",
    honoreePlaceholder: 'e.g., "Alex & Sam"',
    titlePlaceholder: "Our New Home",
    tagline: "Set up your housewarming registry in just a few steps",
  },
  graduation: {
    eventDateLabel: "Graduation Date",
    honoreeLabel: "Graduate",
    honoreePlaceholder: 'e.g., "Alex"',
    titlePlaceholder: "Alex's Graduation",
    tagline: "Set up your graduation registry in just a few steps",
  },
  other: {},
};

export function copyFor(input: {
  registryType: RegistryType | null | undefined;
  eventType?: PersonalEventType | null;
}): RegistryCopy {
  const type = input.registryType ?? "baby";
  if (type === "baby") return BABY;
  const base = PERSONAL_DEFAULTS;
  const override = input.eventType ? PERSONAL_OVERRIDES[input.eventType] : null;
  return override ? { ...base, ...override } : base;
}

export function copyForRegistry(
  registry: Pick<Registry, "registry_type" | "event_type"> | null | undefined,
): RegistryCopy {
  return copyFor({
    registryType: registry?.registry_type ?? "baby",
    eventType: registry?.event_type ?? null,
  });
}

export function honoreeDisplayName(
  registry:
    | Pick<Registry, "honoree_names" | "parent_names">
    | null
    | undefined,
  fallback = "The Registry Owner",
): string {
  return (
    registry?.honoree_names?.trim() ||
    registry?.parent_names?.trim() ||
    fallback
  );
}

export const PERSONAL_EVENT_TYPE_OPTIONS: Array<{
  value: PersonalEventType;
  label: string;
}> = [
  { value: "birthday", label: "Birthday" },
  { value: "christmas", label: "Christmas" },
  { value: "wedding", label: "Wedding" },
  { value: "housewarming", label: "Housewarming" },
  { value: "graduation", label: "Graduation" },
  { value: "other", label: "Other" },
];
