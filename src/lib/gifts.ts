// Gift reservations, shared by the server and the browser.
//
// A guest reserves an item and buys it, then confirms. A reservation holds the
// item for GIFT_HOLD_DAYS, short on purpose so guests buy right away and a
// forgotten gift goes back on the list soon. A daily job sends one reminder
// and releases reservations that ran out (src/lib/gift-reservations-server.ts).
// See supabase/migrations/015_gift_reservations.sql.
//
// The mobile app uses this file too, through its @shared/* path, so it can't
// import anything.

/** How long a reservation holds an item before it goes back on the list. */
export const GIFT_HOLD_DAYS = 2;

/** A visitor's own gift on an item, as the public registry page sends it. */
export interface MyItemGift {
  purchaseId: string;
  /** "reserved" is held until reservedUntil. "purchased" means the guest bought it. */
  status: "reserved" | "purchased";
  reservedUntil: string | null;
  quantity: number;
}

interface PurchaseLike {
  status: string;
  reserved_until?: string | null;
}

/**
 * True for a reservation still waiting for the guest to buy it. Gifts saved
 * before reservations had an end date have no reserved_until, and count as
 * given.
 */
export function isOpenReservation(p: PurchaseLike): boolean {
  return p.status === "reserved" && !!p.reserved_until;
}

/**
 * True for a reservation whose time ran out. The daily job releases these, but
 * until it runs, pages treat the item as available again.
 */
export function isExpiredReservation(p: PurchaseLike, now = Date.now()): boolean {
  return isOpenReservation(p) && new Date(p.reserved_until!).getTime() <= now;
}

export function toMyItemGift(p: PurchaseLike & { id: string; quantity?: number | null }): MyItemGift {
  const open = isOpenReservation(p);
  return {
    purchaseId: p.id,
    status: open ? "reserved" : "purchased",
    reservedUntil: open ? p.reserved_until ?? null : null,
    quantity: p.quantity || 1,
  };
}

/**
 * The name a list's owners and managers see on a Secret Santa's gift, instead
 * of the giver's name. The purchase has hide_giver set. The giver still sees
 * their own name and gets their own emails.
 */
export const SECRET_GIVER_NAME = "Secret Santa";

interface GiverLike {
  buyer_name: string;
  hide_giver?: boolean | null;
}

/** The giver's name as the list's owners and managers may see it. */
export function giverNameForOwner(p: GiverLike): string {
  return p.hide_giver ? SECRET_GIVER_NAME : p.buyer_name;
}

/**
 * A purchase as the list's owners and managers may see it. For a Secret
 * Santa's gift, the name becomes SECRET_GIVER_NAME and the email is removed.
 * The message stays. Other purchases come back unchanged.
 */
export function maskGiverForOwner<T extends GiverLike & { buyer_email?: string | null }>(p: T): T {
  if (!p.hide_giver) return p;
  return {
    ...p,
    buyer_name: SECRET_GIVER_NAME,
    ...("buyer_email" in p ? { buyer_email: null } : {}),
  };
}

// ── Hiding what's been reserved from a list's owner ─────────────────────
//
// A list's owner can choose not to see what people reserved or pledged, so
// their gifts stay a surprise. It's off by default. Regibee turns it on for a
// personal wishlist when its owner adds it to a gift exchange. Guests and
// co-managers still see everything, so nobody buys the same thing twice.
//
// The exception, copied from Giftster: a list kept for a child. The parent
// who keeps it needs to see what's been reserved, so the setting never
// applies to it.
//
// This only changes what the owner's own pages, app screens and emails show.
// The owner can still read the rows. It keeps a surprise, it isn't a lock.

/** The reservation settings in registries.settings. */
export interface ReservationPrivacy {
  /** "Hide what's been reserved from me". Missing means never chosen. */
  hide_reservations?: boolean;
  /** "owner" when the owner chose it, "exchange" when Regibee turned it on. */
  hide_reservations_source?: "owner" | "exchange";
  /** "I keep this list for my child". The owner always sees reservations. */
  for_child?: boolean;
}

/** The reservation settings from a registry's settings, whatever shape they're in. */
export function readReservationPrivacy(settings: unknown): ReservationPrivacy {
  const raw = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  return {
    hide_reservations: typeof raw.hide_reservations === "boolean" ? raw.hide_reservations : undefined,
    hide_reservations_source:
      raw.hide_reservations_source === "owner" || raw.hide_reservations_source === "exchange"
        ? raw.hide_reservations_source
        : undefined,
    for_child: raw.for_child === true,
  };
}

/** True when the list hides what's been reserved from its owner. */
export function hidesReservations(settings: unknown): boolean {
  const privacy = readReservationPrivacy(settings);
  return privacy.hide_reservations === true && !privacy.for_child;
}

/**
 * True when this person shouldn't see what's been reserved on this list: the
 * list hides it, and they're its owner. Co-managers and guests still see it.
 */
export function reservationsHiddenFrom(
  registry: { owner_id: string; settings?: unknown },
  viewerId: string | null | undefined,
): boolean {
  return Boolean(viewerId) && registry.owner_id === viewerId && hidesReservations(registry.settings);
}

/**
 * An item as its owner sees it with reservations hidden: nothing reserved.
 * An item the owner marked as bought themselves stays bought, since that was
 * their own doing.
 */
export function itemAsUnreserved<T extends { quantity_fulfilled: number; is_parent_purchased?: boolean | null }>(
  item: T,
): T {
  return item.is_parent_purchased ? item : { ...item, quantity_fulfilled: 0 };
}

/** A cash fund as its owner sees it with reservations hidden: nothing pledged. */
export function fundAsUnpledged<T extends { current_amount: number }>(fund: T): T {
  return { ...fund, current_amount: 0 };
}

// ── Revealing hidden gifts after an event ───────────────────────────────
//
// When a list that hides reservations is linked to an event, its owner sees
// the gifts reserved before the event from the day after it, for thank-you
// notes. The database works out the moment (gifts_revealed_through in
// supabase/migrations/20261112063128_everyone_gives_everyone.sql) and stops
// the owner reading anything later. These helpers show the owner the gifts
// that are revealed and nothing else, whatever the rows say.

/** Whether a gift made at `createdAt` is revealed, given the list's reveal moment. */
export function isGiftRevealed(createdAt: string, revealedThrough: string | null | undefined): boolean {
  return Boolean(revealedThrough) && new Date(createdAt).getTime() < new Date(revealedThrough!).getTime();
}

interface RevealablePurchase {
  status: string;
  quantity?: number | null;
  amount?: number | string | null;
}

/**
 * An item as its owner sees it with reservations hidden and some gifts
 * revealed: only the revealed gifts count. `revealed` holds the item's
 * revealed purchases.
 */
export function itemAsRevealed<T extends { quantity_fulfilled: number; quantity_needed: number; is_parent_purchased?: boolean | null }>(
  item: T,
  revealed: RevealablePurchase[],
): T {
  if (item.is_parent_purchased) return item;
  const given = revealed.filter((p) => p.status !== "cancelled").reduce((sum, p) => sum + (p.quantity || 1), 0);
  return { ...item, quantity_fulfilled: Math.min(given, item.quantity_needed) };
}

/** A cash fund as its owner sees it with reservations hidden and some gifts revealed. */
export function fundAsRevealed<T extends { current_amount: number }>(fund: T, revealed: RevealablePurchase[]): T {
  const pledged = revealed.filter((p) => p.status !== "cancelled").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return { ...fund, current_amount: pledged };
}

/**
 * A list's settings after its owner added it to a gift exchange as their
 * wishlist, or null when nothing changes. Hiding turns on for a personal
 * wishlist whose owner never chose either way and doesn't keep it for a child.
 * Registries such as a baby registry keep showing what's been reserved, since
 * their owners need it for thank-you notes.
 */
export function settingsAfterJoiningExchange(registry: {
  registry_type: string | null;
  settings: unknown;
}): Record<string, unknown> | null {
  if (registry.registry_type !== "personal") return null;
  const privacy = readReservationPrivacy(registry.settings);
  if (privacy.hide_reservations !== undefined || privacy.for_child) return null;
  const settings = (registry.settings && typeof registry.settings === "object" ? registry.settings : {}) as Record<
    string,
    unknown
  >;
  return { ...settings, hide_reservations: true, hide_reservations_source: "exchange" };
}

/** Steps a gift link can open the gift dialog at. */
export const GIFT_LINK_STEPS = ["buy", "confirm", "release"] as const;
export type GiftLinkStep = (typeof GIFT_LINK_STEPS)[number];

export function isGiftLinkStep(value: unknown): value is GiftLinkStep {
  return typeof value === "string" && (GIFT_LINK_STEPS as readonly string[]).includes(value);
}

/**
 * The link in a guest's emails back to their gift. The purchase id in it is
 * what lets the guest confirm or release the gift, the same as the id in their
 * gifts cookie, so it only ever goes to the guest's own email address.
 */
export function giftLinkUrl(opts: {
  siteUrl: string;
  slug: string;
  purchaseId: string;
  step?: GiftLinkStep;
}): string {
  const base = `${opts.siteUrl}/r/${opts.slug}/gift/${opts.purchaseId}`;
  return opts.step ? `${base}?step=${opts.step}` : base;
}

/** "Sun, Nov 15" in the viewer's time zone. */
export function formatReservedUntil(iso: string, style: "long" | "short" = "long"): string {
  const date = new Date(iso);
  return style === "long"
    ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
