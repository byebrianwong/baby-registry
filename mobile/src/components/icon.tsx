import { SymbolView, type SymbolViewProps } from "expo-symbols";

// SF Symbols on iPhone, Material Symbols on Android and the web preview.
const ICONS = {
  add: { ios: "plus", android: "add" },
  share: { ios: "square.and.arrow.up", android: "share" },
  star: { ios: "star.fill", android: "star" },
  starOutline: { ios: "star", android: "star_outline" },
  trash: { ios: "trash", android: "delete" },
  check: { ios: "checkmark", android: "check" },
  checkCircle: { ios: "checkmark.circle.fill", android: "check_circle" },
  link: { ios: "link", android: "link" },
  paste: { ios: "doc.on.clipboard", android: "content_paste" },
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  person: { ios: "person.crop.circle", android: "person" },
  gift: { ios: "gift", android: "redeem" },
  bag: { ios: "bag", android: "shopping_bag" },
  external: { ios: "arrow.up.right.square", android: "open_in_new" },
  more: { ios: "ellipsis.circle", android: "more_horiz" },
  close: { ios: "xmark", android: "close" },
  edit: { ios: "pencil", android: "edit" },
  store: { ios: "storefront", android: "storefront" },
  fund: { ios: "banknote", android: "savings" },
  people: { ios: "person.2", android: "group" },
  signOut: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  public: { ios: "globe", android: "public" },
  lock: { ios: "lock", android: "lock" },
  calendar: { ios: "calendar", android: "calendar_today" },
  error: { ios: "exclamationmark.triangle", android: "error" },
  refresh: { ios: "arrow.clockwise", android: "refresh" },
  search: { ios: "magnifyingglass", android: "search" },
  minus: { ios: "minus", android: "remove" },
  settings: { ios: "gearshape", android: "settings" },
  image: { ios: "photo", android: "image" },
  eye: { ios: "eye", android: "visibility" },
} as const satisfies Record<string, { ios: string; android: string }>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  weight,
}: {
  name: IconName;
  size?: number;
  color: string;
  weight?: "regular" | "medium" | "semibold" | "bold";
}) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android } as SymbolViewProps["name"]}
      size={size}
      tintColor={color}
      weight={weight ? ({ ios: weight } as SymbolViewProps["weight"]) : undefined}
    />
  );
}
