// Group gifts, shared by the server and the browser (issue #105).
//
// Someone with an account starts a group gift on an open item of a list they
// don't manage. That reserves the item in their name ("Oz and others"), held
// until they buy it (GROUP_GIFT_HOLD_DAYS in src/lib/gifts.ts), so nobody
// else buys it. They share a private link, /group-gift/<token>, and others
// chip in from it, with or without an account. Everyone pays the organizer
// back with Venmo, PayPal or Zelle: Regibee never holds the money.
//
// The list's owner only ever sees the ordinary reservation. The pledges live
// in tables only the server reads. See
// supabase/migrations/20261112062853_group_gifts.sql.

// No imports, so `npm test` can run src/lib/group-gifts.test.ts directly.

/** The most one pledge or goal can be, in dollars. The database checks it too. */
export const MAX_GROUP_GIFT_AMOUNT = 100_000;

/** How long the "how to pay me back" note can be. */
export const PAYBACK_NOTE_MAX = 200;

/**
 * Where a group gift stands, from its reservation: "open" while the
 * organizer collects, "bought" once they've bought it, and "ended" once it
 * was called off or the reservation went away.
 */
export type GroupGiftStatus = "open" | "bought" | "ended";

export function groupGiftStatus(purchase: { status: string } | null | undefined): GroupGiftStatus {
  if (purchase?.status === "reserved") return "open";
  if (purchase?.status === "purchased") return "bought";
  return "ended";
}

/**
 * A dollar amount from what someone typed, like "40", "$40.50" or "1,200",
 * rounded to cents. Null when it isn't one, or isn't between a cent and
 * MAX_GROUP_GIFT_AMOUNT.
 */
export function parseGroupGiftAmount(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  const cleaned = text.replace(/[$,\s]/g, "");
  if (!cleaned || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const amount = Math.round(Number(cleaned) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_GROUP_GIFT_AMOUNT) return null;
  return amount;
}

/**
 * The name on the reservation, as the list's owner sees it: the organizer's
 * first name and "and others", like "Oz and others".
 */
export function groupGiftReservationName(organizerName: string | null | undefined): string {
  const first = organizerName?.trim().split(/\s+/)[0];
  return `${first || "Friends"} and others`;
}

/** The page others chip in from. */
export function groupGiftPath(token: string): string {
  return `/group-gift/${encodeURIComponent(token)}`;
}

/**
 * The full link to a group gift. With a pledge token, it's that pledger's own
 * link, which lets them change or take back their pledge. Only the pledger
 * gets that one, by email.
 */
export function groupGiftUrl(siteUrl: string, token: string, pledgeToken?: string): string {
  const base = `${siteUrl}${groupGiftPath(token)}`;
  return pledgeToken ? `${base}?p=${encodeURIComponent(pledgeToken)}` : base;
}

/** Group gift and pledge tokens are base64url, from 24 random bytes. */
export function isGroupGiftToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(value);
}

/** How far along the collection is, for the progress bar. */
export function groupGiftProgress(pledged: number, goal: number | null): { percent: number; toGo: number } {
  if (!goal || goal <= 0) return { percent: 0, toGo: 0 };
  return {
    percent: Math.min(100, Math.round((pledged / goal) * 100)),
    toGo: Math.max(0, Math.round((goal - pledged) * 100) / 100),
  };
}

// ── What the group gift page shows ───────────────────────────────────────

/** One person who's chipping in, as the viewer may see them. */
export interface GroupGiftPledgeView {
  /** Only the organizer gets pledge ids, to mark them paid. */
  id: string | null;
  name: string;
  /** The organizer sees everyone's amount. Others only see their own. */
  amount: number | null;
  /** Only the organizer sees emails, to chase a payment. */
  email: string | null;
  paid: boolean;
  isMine: boolean;
}

/** The viewer's own pledge. Its token is what lets them change it. */
export interface MyGroupGiftPledge {
  token: string;
  name: string;
  amount: number;
  paid: boolean;
}

export interface GroupGiftView {
  token: string;
  status: GroupGiftStatus;
  item: {
    title: string;
    imageUrl: string | null;
    url: string | null;
    price: number | null;
    /** False once the item was deleted from the list. */
    onList: boolean;
  };
  /** Whose list it is, like "Dorothy". */
  recipientName: string;
  listTitle: string;
  listSlug: string;
  organizerName: string;
  goalAmount: number | null;
  paybackNote: string | null;
  /** Everything pledged so far. */
  pledged: number;
  pledges: GroupGiftPledgeView[];
  /** The event it was started from, if any. */
  event: { title: string; slug: string } | null;
}

export interface GroupGiftViewer {
  role: "organizer" | "pledger" | "visitor";
  signedIn: boolean;
  myPledge: MyGroupGiftPledge | null;
  /** Name and email for the pledge form: from the account, or an event invitation. */
  prefill: { name: string; email: string | null } | null;
}

/** A group gift as it shows on an event's page, to its guests. */
export interface EventGroupGift {
  token: string;
  status: Exclude<GroupGiftStatus, "ended">;
  itemTitle: string;
  imageUrl: string | null;
  recipientName: string;
  organizerName: string;
  goalAmount: number | null;
  pledged: number;
  pledgeCount: number;
}
