// Perks stores give the owners of their registries, and how far along each one
// is for a registry. Perk rules change often and differ by store (membership,
// minimum spend, dates), so everything store-specific lives in STORE_PERKS and
// the wording only says what owners "may" get. Check each store's own terms
// when updating. Last checked November 2026.

import {
  getStore,
  registryStoreFor,
  STORES,
  type RetailerRegistry,
  type StoreId,
} from "@/lib/retailers";

interface WelcomeBoxRule {
  /** What the store calls it, as it reads mid-sentence. */
  name: string;
  /**
   * "first_gift": owners can ask for it once a gift is bought from their
   * registry. "anytime": owners can ask for it once the registry exists.
   */
  after: "first_gift" | "anytime";
}

interface CompletionDiscountRule {
  /** Shown after "Open now:", e.g. "15% off". */
  amount: string;
  /** How many days before the due date the discount opens. */
  opensDaysBefore: number;
}

interface StorePerkRules {
  welcomeBox?: WelcomeBoxRule;
  completionDiscount?: CompletionDiscountRule;
  /** The longer return window for registry gifts. */
  returns?: string;
}

export const STORE_PERKS: Record<StoreId, StorePerkRules> = {
  amazon: {
    // Prime members can claim it from their registry once they qualify,
    // which has meant a first purchase from the registry.
    welcomeBox: { name: "welcome box", after: "first_gift" },
    completionDiscount: { amount: "10% off, or 15% with Prime", opensDaysBefore: 60 },
    returns: "365 days on most gifts",
  },
  target: {
    // Picked up in store once you have a registry.
    welcomeBox: { name: "welcome kit", after: "anytime" },
    completionDiscount: { amount: "15% off", opensDaysBefore: 56 },
    returns: "1 year on registry gifts",
  },
  walmart: {
    // Walmart has no completion discount.
    welcomeBox: { name: "welcome box", after: "anytime" },
    returns: "Up to 1 year on many gifts",
  },
  babylist: {
    // The Hello Baby Box needs a purchase from the registry.
    welcomeBox: { name: "Hello Baby Box", after: "first_gift" },
    completionDiscount: { amount: "15% off Babylist Shop items", opensDaysBefore: 60 },
    returns: "9 months on Babylist Shop gifts",
  },
  potterybarnkids: {
    completionDiscount: { amount: "15% off", opensDaysBefore: 60 },
  },
};

/** How long after the due date to keep calling a completion discount open. */
const COMPLETION_OPEN_DAYS_AFTER = 60;

// ── Owner choices, kept in registries.settings.store_perks ──────────────────

export interface StorePerksState {
  /** Stores whose welcome box the owner has asked for. */
  welcomeBoxDone: StoreId[];
  /** Owners get perk emails unless they turn them off. */
  emails: boolean;
  /** Reminder emails already sent, like "completion:amazon". */
  sent: string[];
}

export function parseStorePerksState(settings: unknown): StorePerksState {
  const raw =
    settings && typeof settings === "object"
      ? (settings as Record<string, unknown>).store_perks
      : undefined;
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const done = Array.isArray(obj.welcome_box_done) ? obj.welcome_box_done : [];
  const sent = Array.isArray(obj.sent) ? obj.sent : [];
  return {
    welcomeBoxDone: STORES.map((s) => s.id).filter((id) => done.includes(id)),
    emails: obj.emails !== false,
    sent: sent.filter((s): s is string => typeof s === "string"),
  };
}

/** The settings.store_perks value for a state. */
export function storePerksSettings(state: StorePerksState) {
  return {
    welcome_box_done: state.welcomeBoxDone,
    emails: state.emails,
    sent: state.sent,
  };
}

// ── Dates (YYYY-MM-DD strings, like registries.event_date) ──────────────────

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function formatShortDate(date: string, today: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  });
}

export function completionDiscountOpens(store: StoreId, dueDate: string): string | null {
  const rule = STORE_PERKS[store].completionDiscount;
  return rule ? addDays(dueDate, -rule.opensDaysBefore) : null;
}

/** True while the store's completion discount is likely open. */
export function isCompletionDiscountOpen(store: StoreId, dueDate: string, today: string): boolean {
  const opens = completionDiscountOpens(store, dueDate);
  return !!opens && today >= opens && today <= addDays(dueDate, COMPLETION_OPEN_DAYS_AFTER);
}

// ── One row per store on the Store perks tab ────────────────────────────────

export type PerkTone = "ready" | "waiting" | "upcoming" | "done";

export interface PerkStatus {
  label: string;
  status: string;
  tone: PerkTone;
}

export interface WelcomeBoxStatus {
  /** What the store calls it, as it reads mid-sentence. */
  name: string;
  /** "waiting": no gift yet. "ready": the owner may be able to ask for it. */
  status: "waiting" | "ready" | "done";
  /** Ready because a guest reserved a gift, not just because the registry exists. */
  afterGift: boolean;
}

export interface StorePerksRow {
  storeId: StoreId;
  name: string;
  domain: string;
  /** The owner's registry page at the store, if they linked it. */
  registryUrl: string | null;
  /** Items whose gifts count toward this store registry. */
  itemCount: number;
  /** Live reservations of those items. */
  giftCount: number;
  welcomeBox: WelcomeBoxStatus | null;
  /** Completion discount and returns. */
  perks: PerkStatus[];
}

export interface PerkItem {
  id: string;
  external_url: string | null;
  is_parent_purchased: boolean;
}

export interface PerkPurchase {
  registry_item_id: string | null;
  status: string;
}

/** Which store registry each item's gifts count toward. */
export function itemsByStore(
  items: PerkItem[],
  linkedRegistries: RetailerRegistry[]
): Map<StoreId, PerkItem[]> {
  const linkedStores = linkedRegistries.map((r) => r.store);
  const byStore = new Map<StoreId, PerkItem[]>();
  for (const item of items) {
    const store = registryStoreFor(item.external_url, linkedStores);
    if (!store) continue;
    byStore.set(store.id, [...(byStore.get(store.id) ?? []), item]);
  }
  return byStore;
}

/**
 * The stores to show: every linked store registry, plus any store whose
 * registry links are on items. In the same order as STORES.
 */
export function perkStores(
  items: PerkItem[],
  linkedRegistries: RetailerRegistry[]
): StoreId[] {
  const byStore = itemsByStore(items, linkedRegistries);
  return STORES.map((s) => s.id).filter(
    (id) => byStore.has(id) || linkedRegistries.some((r) => r.store === id)
  );
}

export function buildStorePerks(opts: {
  items: PerkItem[];
  purchases: PerkPurchase[];
  linkedRegistries: RetailerRegistry[];
  /** The due date, YYYY-MM-DD. */
  dueDate: string | null;
  /** YYYY-MM-DD. */
  today: string;
  state: StorePerksState;
}): StorePerksRow[] {
  const { purchases, linkedRegistries, dueDate, today, state } = opts;
  const byStore = itemsByStore(opts.items, linkedRegistries);

  return perkStores(opts.items, linkedRegistries).map((storeId) => {
    const store = getStore(storeId);
    const rules = STORE_PERKS[storeId];
    const items = byStore.get(storeId) ?? [];
    // Gifts guests reserved. Items the owner marked as bought themselves are
    // left out: guests who "cover" those send money instead of buying there.
    const giftItemIds = new Set(items.filter((i) => !i.is_parent_purchased).map((i) => i.id));
    const giftCount = purchases.filter(
      (p) => p.status !== "cancelled" && p.registry_item_id && giftItemIds.has(p.registry_item_id)
    ).length;

    let welcomeBox: WelcomeBoxStatus | null = null;
    if (rules.welcomeBox) {
      const afterGift = rules.welcomeBox.after === "first_gift";
      welcomeBox = {
        name: rules.welcomeBox.name,
        status: state.welcomeBoxDone.includes(storeId)
          ? "done"
          : afterGift && giftCount === 0
            ? "waiting"
            : "ready",
        afterGift,
      };
    }

    const perks: PerkStatus[] = [];
    if (rules.completionDiscount) {
      const label = "Completion discount";
      if (!dueDate) {
        perks.push({ label, status: "Add your due date", tone: "waiting" });
      } else {
        const opens = completionDiscountOpens(storeId, dueDate)!;
        if (today < opens) {
          perks.push({ label, status: `Opens ${formatShortDate(opens, today)}`, tone: "upcoming" });
        } else if (isCompletionDiscountOpen(storeId, dueDate, today)) {
          perks.push({ label, status: `Open now: ${rules.completionDiscount.amount}`, tone: "ready" });
        } else {
          perks.push({ label, status: "May have ended", tone: "waiting" });
        }
      }
    }
    if (rules.returns) {
      perks.push({ label: "Returns", status: rules.returns, tone: "upcoming" });
    }

    return {
      storeId,
      name: store.name,
      domain: store.domain,
      registryUrl: linkedRegistries.find((r) => r.store === storeId)?.url ?? null,
      itemCount: items.length,
      giftCount,
      welcomeBox,
      perks,
    };
  });
}

/** How many welcome boxes are ready and not yet asked for. Shown on the tab. */
export function readyPerkCount(rows: StorePerksRow[]): number {
  return rows.filter((r) => r.welcomeBox?.status === "ready").length;
}
