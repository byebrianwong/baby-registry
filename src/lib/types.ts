export interface PaymentMethods {
  venmo?: string;
  paypal?: string;
  zelle?: string;
}

export interface RegistrySettings {
  payment_methods?: PaymentMethods;
  shipping_address?: string;
  [key: string]: unknown;
}

export type RegistryType = "baby" | "personal";

export type PersonalEventType =
  | "birthday"
  | "christmas"
  | "wedding"
  | "housewarming"
  | "graduation"
  | "other";

export interface Registry {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  event_date: string | null;
  is_public: boolean;
  listed_on_profile: boolean;
  description: string | null;
  photo_url: string | null;
  settings: RegistrySettings;
  registry_type: RegistryType;
  event_type: PersonalEventType | null;
  honoree_names: string | null;
  parent_names?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  registry_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface RegistryItem {
  id: string;
  registry_id: string;
  category_id: string | null;
  title: string;
  external_url: string | null;
  image_url: string | null;
  price: number | null;
  quantity_needed: number;
  quantity_fulfilled: number;
  is_essential: boolean;
  is_parent_purchased: boolean;
  notes: string | null;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CashFund {
  id: string;
  registry_id: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  current_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Suggestion {
  id: string;
  registry_id: string;
  title: string;
  external_url: string | null;
  price: number | null;
  notes: string | null;
  suggested_by_name: string;
  suggested_by_email: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface Purchase {
  id: string;
  registry_item_id: string | null;
  cash_fund_id: string | null;
  buyer_name: string;
  buyer_email: string | null;
  quantity: number;
  amount: number | null;
  status: "reserved" | "purchased" | "cancelled";
  message: string | null;
  created_at: string;
  updated_at: string;
  item_title?: string;
}
