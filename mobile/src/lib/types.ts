// The rows the app reads, matching the website's src/lib/types.ts and the
// tables in supabase/migrations.

export type RegistryType = "baby" | "personal";
export type EventType = "birthday" | "christmas" | "wedding" | "housewarming" | "graduation" | "other";

export interface Registry {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  event_date: string | null;
  is_public: boolean;
  description: string | null;
  photo_url: string | null;
  registry_type: RegistryType | null;
  event_type: EventType | null;
  honoree_names: string | null;
  /**
   * The registry's settings. The app reads only "Hide what's been reserved
   * from me" from it, with reservationsHiddenFrom (src/lib/gifts.ts).
   */
  settings?: Record<string, unknown> | null;
  created_at: string;
}

export interface Category {
  id: string;
  registry_id: string;
  name: string;
  sort_order: number;
}

export interface Item {
  id: string;
  registry_id: string;
  category_id: string | null;
  title: string;
  external_url: string | null;
  image_url: string | null;
  price: number | null;
  quantity_needed: number;
  quantity_fulfilled: number;
  /** "Most wanted" on the website. */
  is_essential: boolean;
  /** "I bought it myself": guests can still give it by sending the money. */
  is_parent_purchased: boolean;
  is_open_to_used: boolean;
  minimum_condition: UsedCondition | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  /**
   * Guests' gifts of this item, newest first, cancelled ones included.
   * Reserving raises quantity_fulfilled, so these tell an open hold from a
   * gift that was given.
   */
  purchases: ItemGift[];
}

/** A gift as an item's row reads it. */
export type ItemGift = Pick<Gift, "id" | "status" | "reserved_until" | "buyer_name" | "quantity">;

export interface CashFund {
  id: string;
  registry_id: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  current_amount: number;
}

export type PurchaseStatus = "reserved" | "purchased" | "cancelled";

export interface Gift {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  quantity: number;
  amount: number | null;
  status: PurchaseStatus;
  /**
   * When a guest's hold on the item runs out, while they still have to buy it.
   * Null for gifts given before holds existed, which count as given. Read it
   * with isOpenReservation (src/lib/gifts.ts).
   */
  reserved_until: string | null;
  message: string | null;
  created_at: string;
  registry_item_id: string | null;
  cash_fund_id: string | null;
  /** The item's or fund's title. */
  for_title: string;
  kind: "item" | "fund";
  /**
   * A Secret Santa's gift. data.ts already swaps the name for "Secret Santa"
   * and removes the email, so owners never see who gave it.
   */
  hide_giver?: boolean;
}

/** The lowest used condition an owner will accept, as the website offers them (src/lib/extension.ts). */
export const USED_CONDITIONS = [
  { id: "like-new", label: "Like new" },
  { id: "very-good", label: "Very good" },
  { id: "good", label: "Good" },
  { id: "acceptable", label: "Acceptable" },
] as const;

export type UsedCondition = (typeof USED_CONDITIONS)[number]["id"];

/** A registry on the home screen, with what its card summarizes. */
export interface RegistrySummary extends Registry {
  role: "owner" | "manager";
  itemCount: number;
  fulfilledCount: number;
  totalValue: number;
  /** `held` is true while the guest's reservation waits for them to buy it. */
  recentGifts: { id: string; buyer_name: string; created_at: string; held: boolean }[];
  /**
   * The owner hides what's been reserved from themselves. Then fulfilledCount
   * counts only items they bought, and recentGifts is empty.
   */
  reservationsHidden: boolean;
}

export interface RegistryDetail {
  registry: Registry;
  role: "owner" | "manager";
  categories: Category[];
  items: Item[];
  funds: CashFund[];
  pendingSuggestions: number;
  /**
   * The owner hides what's been reserved from themselves. Then items show
   * nothing reserved, funds nothing pledged, and there are no gifts.
   */
  reservationsHidden: boolean;
}

/** The fields of the add and edit item forms. */
export interface ItemInput {
  title: string;
  external_url: string | null;
  image_url: string | null;
  price: number | null;
  quantity_needed: number;
  category_id: string | null;
  is_essential: boolean;
  is_parent_purchased: boolean;
  is_open_to_used: boolean;
  minimum_condition: UsedCondition | null;
  notes: string | null;
}
