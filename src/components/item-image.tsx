import {
  Moon,
  Utensils,
  Package,
  Car,
  Bath,
  Shirt,
  HeartPulse,
  BookOpen,
  Heart,
  Gift,
  type LucideIcon,
} from "lucide-react";

type CategoryTheme = {
  Icon: LucideIcon;
  bg: string;
  fg: string;
};

const FALLBACK_THEME: CategoryTheme = {
  Icon: Package,
  bg: "#f4f4f5",
  fg: "#71717a",
};

// Pastel background + darker-tone icon per category.
// Keyed off substrings in the category name so this works whether categories
// come from the seed data or a parent-renamed category.
const CATEGORY_THEMES: ReadonlyArray<[RegExp, CategoryTheme]> = [
  [/nursery|sleep/i, { Icon: Moon, bg: "#efe9ff", fg: "#5b3fbf" }],
  [/feed|bottle|nursing/i, { Icon: Utensils, bg: "#fff0e3", fg: "#b45309" }],
  [/diaper/i, { Icon: Package, bg: "#e3f8ec", fg: "#047857" }],
  [/gear|travel|stroller|car seat/i, { Icon: Car, bg: "#e5f3ff", fg: "#0369a1" }],
  [/bath/i, { Icon: Bath, bg: "#e0f5f5", fg: "#0d9488" }],
  [/cloth|outfit/i, { Icon: Shirt, bg: "#ffe3ee", fg: "#be185d" }],
  [/health|safety/i, { Icon: HeartPulse, bg: "#ffe4e4", fg: "#be123c" }],
  [/toy|book|play/i, { Icon: BookOpen, bg: "#fff6d6", fg: "#a16207" }],
  [/maternity|postpartum|mama|mom/i, { Icon: Heart, bg: "#ffe9ef", fg: "#9d174d" }],
  [/gift|extra/i, { Icon: Gift, bg: "#e3f0ea", fg: "#004659" }],
];

function themeFor(categoryName?: string | null): CategoryTheme {
  if (!categoryName) return FALLBACK_THEME;
  for (const [pattern, theme] of CATEGORY_THEMES) {
    if (pattern.test(categoryName)) return theme;
  }
  return FALLBACK_THEME;
}

interface ItemImageProps {
  imageUrl?: string | null;
  title: string;
  categoryName?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function ItemImage({
  imageUrl,
  title,
  categoryName,
  size = "sm",
  className = "",
}: ItemImageProps) {
  const sizeClass = size === "md" ? "size-20" : "size-16";
  const iconClass = size === "md" ? "h-9 w-9" : "h-7 w-7";

  if (imageUrl) {
    return (
      <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center rounded-md bg-[#fdfdfd] ${className}`}>
        <img
          src={imageUrl}
          alt={title}
          className={`${sizeClass} rounded-md object-cover`}
        />
      </div>
    );
  }

  const { Icon, bg, fg } = themeFor(categoryName);
  return (
    <div
      className={`relative flex ${sizeClass} shrink-0 items-center justify-center rounded-md ${className}`}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      <Icon className={iconClass} style={{ color: fg }} />
    </div>
  );
}
