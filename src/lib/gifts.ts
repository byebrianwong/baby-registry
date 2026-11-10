// Gift reservations, shared by the server and the browser.
//
// A guest reserves an item and buys it, then confirms. A reservation holds the
// item for GIFT_HOLD_DAYS, short on purpose so guests buy right away and a
// forgotten gift goes back on the list soon. A daily job sends one reminder
// and releases reservations that ran out (src/lib/gift-reservations-server.ts).
// See supabase/migrations/015_gift_reservations.sql.

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
