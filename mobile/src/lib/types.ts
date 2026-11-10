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
}

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
  message: string | null;
  created_at: string;
  registry_item_id: string | null;
  cash_fund_id: string | null;
  /** The item's or fund's title. */
  for_title: string;
  kind: "item" | "fund";
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
  recentGifts: { id: string; buyer_name: string; created_at: string }[];
}

export interface RegistryDetail {
  registry: Registry;
  role: "owner" | "manager";
  categories: Category[];
  items: Item[];
  funds: CashFund[];
  pendingSuggestions: number;
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
