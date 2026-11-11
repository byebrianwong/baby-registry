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
