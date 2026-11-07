import type { PersonalEventType, RegistryType } from "@/lib/types";

// Each occasion's tint from the brand palette (src/styles/theme.css). These
// match the occasion chips on the landing page: baby is blush, birthday is
// sunshine, Christmas is mint, and everything else is teal.
export interface OccasionTheme {
  /** Soft background for a band or panel. */
  bg: string;
  /** Icon color on white. */
  icon: string;
  /** Text color on white or on `bg` (at least 4.5:1). */
  text: string;
}

const BLUSH: OccasionTheme = { bg: "bg-blush-100", icon: "text-blush-700", text: "text-blush-700" };
const SUNSHINE: OccasionTheme = { bg: "bg-sunshine-100", icon: "text-sunshine-700", text: "text-sunshine-900" };
const MINT: OccasionTheme = { bg: "bg-mint-100", icon: "text-mint-800", text: "text-mint-800" };
const TEAL: OccasionTheme = { bg: "bg-brand-100", icon: "text-brand-600", text: "text-brand-700" };

export function occasionTheme(registryType: RegistryType, eventType: PersonalEventType | null): OccasionTheme {
  if (registryType === "baby") return BLUSH;
  if (eventType === "birthday") return SUNSHINE;
  if (eventType === "christmas") return MINT;
  return TEAL;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// "12 days to go", "Tomorrow", "Today" or "Event passed". Baby registries
// count down to the due date instead. Both dates are YYYY-MM-DD strings, like
// `event_date`, so the result doesn't depend on the time of day.
export function countdownLabel(eventDate: string, today: string, registryType: RegistryType): string {
  const days = Math.round((Date.parse(eventDate) - Date.parse(today)) / DAY_MS);
  const baby = registryType === "baby";
  if (days < 0) return baby ? "Due date passed" : "Event passed";
  if (days === 0) return baby ? "Due today" : "Today";
  if (days === 1) return baby ? "Due tomorrow" : "Tomorrow";
  return baby ? `Due in ${days} days` : `${days} days to go`;
}
