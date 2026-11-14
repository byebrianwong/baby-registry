// Every registry in the demo: Remi & Max's baby registry (src/lib/demo-data.ts),
// Max's birthday wishlist and their Christmas list, which they own, and
// registries from friends and family. Dates count from `today` (YYYY-MM-DD),
// like the rest of the demo.

import {
  addDays,
  DEMO_CASH_FUNDS,
  DEMO_CATEGORIES,
  DEMO_ITEMS,
  DEMO_REGISTRY,
  demoDueDate,
  demoPurchases,
  demoSuggestions,
} from "@/lib/demo-data";
import { DEMO_DOROTHY, DEMO_ELPHABA, DEMO_GLINDA, DEMO_ME, DEMO_OZ, type DemoPerson } from "@/lib/demo-people";
import type { FeedRegistry } from "@/lib/follows";
import type { ListedRegistry } from "@/lib/registry-listing";
import type { PersonalEventType, RegistrySettings, RegistryType } from "@/lib/types";

export interface DemoCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface DemoItem {
  id: string;
  title: string;
  category_id: string | null;
  external_url: string | null;
  image_url: string | null;
  price: number | null;
  quantity_needed: number;
  quantity_fulfilled: number;
  is_essential: boolean;
  is_parent_purchased: boolean;
  is_open_to_used: boolean;
  minimum_condition: string | null;
  notes: string | null;
  sort_order: number;
}

export interface DemoCashFund {
  id: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  current_amount: number;
}

export interface DemoPurchase {
  id: string;
  registry_item_id: string | null;
  cash_fund_id: string | null;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  amount: number | null;
  status: "reserved" | "cancelled";
  message: string | null;
  created_at: string;
  item_title: string;
}

export interface DemoSuggestion {
  id: string;
  title: string;
  external_url: string | null;
  price: number | null;
  notes: string | null;
  suggested_by_name: string;
  suggested_by_email: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface DemoManager {
  name: string;
  email: string;
  role: "owner" | "manager";
}

export interface DemoRegistry {
  /** In manage links: /demo/dashboard/registry/<id>. */
  id: string;
  /** In share links: /demo/r/<slug>. */
  slug: string;
  title: string;
  registry_type: RegistryType;
  event_type: PersonalEventType | null;
  /** YYYY-MM-DD */
  event_date: string | null;
  honoree_names: string;
  description: string | null;
  is_public: boolean;
  listed_on_profile: boolean;
  owner: DemoPerson;
  settings: RegistrySettings & { zip_code?: string };
  categories: DemoCategory[];
  items: DemoItem[];
  cashFunds: DemoCashFund[];
  purchases: DemoPurchase[];
  suggestions: DemoSuggestion[];
  /** Who manages it. Only Remi & Max's registries list them. */
  managers: DemoManager[];
}

/** An ISO timestamp `days` days before today, at `time` (HH:MM, UTC). */
function daysAgo(today: string, days: number, time: string): string {
  return `${addDays(today, -days)}T${time}:00Z`;
}

/**
 * The Christmas the demo plans for: this year's, until the week before it.
 * From December 19 on, the demo's Secret Santa party would be over, so it
 * moves to next year.
 */
export function demoChristmas(today: string): string {
  const year = Number(today.slice(0, 4));
  return today <= `${year}-12-18` ? `${year}-12-25` : `${year + 1}-12-25`;
}

function item(partial: Partial<DemoItem> & Pick<DemoItem, "id" | "title" | "price">): DemoItem {
  return {
    category_id: null,
    external_url: null,
    image_url: null,
    quantity_needed: 1,
    quantity_fulfilled: 0,
    is_essential: false,
    is_parent_purchased: false,
    is_open_to_used: false,
    minimum_condition: null,
    notes: null,
    sort_order: 0,
    ...partial,
  };
}

function gift(
  today: string,
  partial: Omit<DemoPurchase, "created_at" | "status" | "quantity" | "amount" | "message" | "cash_fund_id" | "registry_item_id"> &
    Partial<DemoPurchase> & { daysAgo: number },
): DemoPurchase {
  const { daysAgo: days, ...rest } = partial;
  return {
    registry_item_id: null,
    cash_fund_id: null,
    quantity: 1,
    amount: null,
    status: "reserved",
    message: null,
    created_at: daysAgo(today, days, "15:00"),
    ...rest,
  };
}

const PORTER_ADDRESS = DEMO_REGISTRY.settings.shipping_address;

function babyRegistry(today: string): DemoRegistry {
  return {
    id: "baby",
    slug: "remi-and-max",
    title: DEMO_REGISTRY.title,
    registry_type: "baby",
    event_type: null,
    event_date: demoDueDate(today),
    honoree_names: DEMO_REGISTRY.honoree_names,
    description: DEMO_REGISTRY.description,
    is_public: true,
    listed_on_profile: true,
    owner: DEMO_ME,
    settings: DEMO_REGISTRY.settings,
    categories: DEMO_CATEGORIES,
    items: DEMO_ITEMS,
    cashFunds: DEMO_CASH_FUNDS,
    purchases: demoPurchases(today),
    suggestions: demoSuggestions(today),
    managers: [
      { name: "Remi & Max", email: DEMO_ME.email, role: "owner" },
      { name: "Glinda Upland", email: DEMO_GLINDA.email, role: "manager" },
    ],
  };
}

function birthdayWishlist(today: string): DemoRegistry {
  return {
    id: "wishlist",
    slug: "max-turns-30",
    title: "Max's 30th Birthday",
    registry_type: "personal",
    event_type: "birthday",
    event_date: addDays(today, 40),
    honoree_names: "Max",
    description:
      "Thirty! Please don't feel you need to bring anything. If you'd like to, here are a few things I've had my eye on.",
    // Private: only approved followers see it on the profile. The link still works for anyone.
    is_public: false,
    listed_on_profile: true,
    owner: DEMO_ME,
    settings: {
      payment_methods: { venmo: "@max-porter" },
      shipping_address: PORTER_ADDRESS,
    },
    categories: [
      { id: "w-cat-1", name: "Kitchen", sort_order: 0 },
      { id: "w-cat-2", name: "Outdoors", sort_order: 1 },
      { id: "w-cat-3", name: "Books & records", sort_order: 2 },
    ],
    items: [
      item({
        id: "w-item-1",
        title: "Le Creuset Dutch Oven (5.5 qt)",
        category_id: "w-cat-1",
        price: 420,
        is_essential: true,
        notes: "The big one. Happy to have friends go in on it together.",
        sort_order: 0,
      }),
      item({
        id: "w-item-2",
        title: "Fellow Stagg EKG Kettle",
        category_id: "w-cat-1",
        price: 165,
        quantity_fulfilled: 1,
        notes: "Matte black, please!",
        sort_order: 1,
      }),
      item({ id: "w-item-3", title: "Chef'n Garlic Zoom", category_id: "w-cat-1", price: 15, sort_order: 2 }),
      item({
        id: "w-item-4",
        title: "Patagonia Nano Puff Jacket (Medium)",
        category_id: "w-cat-2",
        price: 239,
        notes: "Any dark color",
        sort_order: 0,
      }),
      item({
        id: "w-item-5",
        title: "Trekking Poles",
        category_id: "w-cat-2",
        price: 99,
        is_open_to_used: true,
        minimum_condition: "good",
        sort_order: 1,
      }),
      item({
        id: "w-item-6",
        title: "National Parks Annual Pass",
        category_id: "w-cat-2",
        price: 80,
        quantity_fulfilled: 1,
        sort_order: 2,
      }),
      item({
        id: "w-item-7",
        title: "The Wonderful Wizard of Oz (Illustrated Edition)",
        category_id: "w-cat-3",
        image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=300&fit=crop",
        price: 35,
        quantity_fulfilled: 1,
        is_parent_purchased: true,
        notes: "I found this one on sale, so it's on its way. Chip in if you'd like!",
        sort_order: 0,
      }),
      item({ id: "w-item-8", title: "Kind of Blue on Vinyl", category_id: "w-cat-3", price: 28, sort_order: 1 }),
    ],
    cashFunds: [
      {
        id: "w-fund-1",
        title: "Weekend in Napa",
        description: "A weekend away before the baby comes. Every bit helps!",
        goal_amount: 600,
        current_amount: 225,
      },
    ],
    purchases: [
      gift(today, {
        id: "w-purchase-1",
        registry_item_id: "w-item-2",
        buyer_name: "Glinda Upland",
        buyer_email: DEMO_GLINDA.email,
        message: "Happy 30th! For all the pour-overs.",
        item_title: "Fellow Stagg EKG Kettle",
        daysAgo: 3,
      }),
      gift(today, {
        id: "w-purchase-2",
        registry_item_id: "w-item-6",
        buyer_name: "Oz Diggs",
        buyer_email: DEMO_OZ.email,
        item_title: "National Parks Annual Pass",
        daysAgo: 5,
      }),
      gift(today, {
        id: "w-purchase-3",
        cash_fund_id: "w-fund-1",
        buyer_name: "Henry Gale",
        buyer_email: "henry@example.com",
        amount: 100,
        message: "Have a glass for me.",
        item_title: "Weekend in Napa",
        daysAgo: 2,
      }),
      gift(today, {
        id: "w-purchase-4",
        cash_fund_id: "w-fund-1",
        buyer_name: "Glinda Upland",
        buyer_email: DEMO_GLINDA.email,
        amount: 125,
        item_title: "Weekend in Napa",
        daysAgo: 3,
      }),
    ],
    suggestions: [
      {
        id: "w-suggestion-1",
        title: "AeroPress Coffee Maker",
        external_url: "https://aeropress.com",
        price: 40,
        notes: "Goes with the kettle!",
        suggested_by_name: "Oz Diggs",
        suggested_by_email: DEMO_OZ.email,
        status: "pending",
        created_at: daysAgo(today, 1, "18:20"),
      },
    ],
    managers: [{ name: "Remi & Max", email: DEMO_ME.email, role: "owner" }],
  };
}

/**
 * Remi & Max's Christmas list. It's their wish list on the family Christmas
 * (src/lib/demo-events.ts), where everyone gives everyone.
 */
function christmasList(today: string): DemoRegistry {
  return {
    id: "christmas-list",
    slug: "remi-and-max-christmas",
    title: "Remi & Max's Christmas List",
    registry_type: "personal",
    event_type: "christmas",
    event_date: demoChristmas(today),
    honoree_names: "Remi & Max",
    description:
      "Our wish list for the family Christmas. Bring gifts to dinner, or ship them to us if you can't make it.",
    // Private: only approved followers see it on the profile. Family gets the link from the invitation.
    is_public: false,
    listed_on_profile: true,
    owner: DEMO_ME,
    settings: {
      payment_methods: { venmo: "@remi-and-max" },
      shipping_address: PORTER_ADDRESS,
    },
    categories: [
      { id: "x-cat-1", name: "For us", sort_order: 0 },
      { id: "x-cat-2", name: "For the baby", sort_order: 1 },
    ],
    items: [
      item({
        id: "x-item-1",
        title: "Coffee Subscription (3 months)",
        category_id: "x-cat-1",
        image_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop",
        price: 75,
        is_essential: true,
        notes: "For the 6 AM feeds. Whole bean, please!",
        sort_order: 0,
      }),
      item({
        id: "x-item-2",
        title: "Wingspan Board Game",
        category_id: "x-cat-1",
        price: 65,
        quantity_fulfilled: 1,
        sort_order: 1,
      }),
      item({
        id: "x-item-3",
        title: "Potted Cactus Trio",
        category_id: "x-cat-1",
        image_url: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=300&h=300&fit=crop",
        price: 45,
        quantity_fulfilled: 1,
        sort_order: 2,
      }),
      item({ id: "x-item-4", title: "Hatch Restore 2 Sunrise Alarm", category_id: "x-cat-1", price: 170, sort_order: 3 }),
      item({
        id: "x-item-5",
        title: "Baby's First Christmas Ornament",
        category_id: "x-cat-2",
        price: 18,
        sort_order: 0,
      }),
      item({
        id: "x-item-6",
        title: "Jellycat Bartholomew Bear",
        category_id: "x-cat-2",
        image_url: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=300&h=300&fit=crop",
        price: 30,
        sort_order: 1,
      }),
      item({
        id: "x-item-7",
        title: "Indestructibles Board Books",
        category_id: "x-cat-2",
        price: 12,
        quantity_needed: 3,
        quantity_fulfilled: 1,
        notes: "Any of them! They survive chewing.",
        sort_order: 2,
      }),
    ],
    cashFunds: [
      {
        id: "x-fund-1",
        title: "Date night",
        description: "One night out once the baby's here. Babysitters welcome too!",
        goal_amount: 200,
        current_amount: 60,
      },
    ],
    purchases: [
      gift(today, {
        id: "x-purchase-1",
        registry_item_id: "x-item-2",
        buyer_name: "Oz Diggs",
        buyer_email: DEMO_OZ.email,
        message: "Merry Christmas! The pecan pie is on me too.",
        item_title: "Wingspan Board Game",
        daysAgo: 2,
      }),
      gift(today, {
        id: "x-purchase-2",
        registry_item_id: "x-item-3",
        buyer_name: "Elphaba Thropp",
        buyer_email: DEMO_ELPHABA.email,
        item_title: "Potted Cactus Trio",
        daysAgo: 4,
      }),
      gift(today, {
        id: "x-purchase-3",
        registry_item_id: "x-item-7",
        buyer_name: "Dorothy Gale",
        buyer_email: DEMO_DOROTHY.email,
        message: "From Lily and Sam, who chose this one.",
        item_title: "Indestructibles Board Books",
        daysAgo: 1,
      }),
      gift(today, {
        id: "x-purchase-4",
        cash_fund_id: "x-fund-1",
        buyer_name: "Glinda Upland",
        buyer_email: DEMO_GLINDA.email,
        amount: 60,
        message: "Fiyero and I will babysit too!",
        item_title: "Date night",
        daysAgo: 6,
      }),
    ],
    suggestions: [],
    managers: [{ name: "Remi & Max", email: DEMO_ME.email, role: "owner" }],
  };
}

/** A registry from someone Remi & Max follow. Guests only see its share page. */
function friendRegistry(
  partial: Pick<
    DemoRegistry,
    "id" | "slug" | "title" | "registry_type" | "event_type" | "event_date" | "honoree_names" | "description" | "is_public" | "owner" | "categories" | "items"
  > &
    Partial<DemoRegistry>,
): DemoRegistry {
  return {
    listed_on_profile: true,
    settings: { payment_methods: { venmo: "@demo" } },
    cashFunds: [],
    purchases: [],
    suggestions: [],
    managers: [],
    ...partial,
  };
}

function friendsRegistries(today: string): DemoRegistry[] {
  return [
    friendRegistry({
      id: "glinda-wedding",
      slug: "glinda-and-fiyero",
      title: "Glinda & Fiyero's Wedding",
      registry_type: "personal",
      event_type: "wedding",
      event_date: addDays(today, 120),
      honoree_names: "Glinda & Fiyero",
      description: "We can't wait to celebrate with you. Your being there is the best gift!",
      // Only approved followers see it on Glinda's profile. Remi & Max are one.
      is_public: false,
      owner: DEMO_GLINDA,
      categories: [
        { id: "g-cat-1", name: "Kitchen & dining", sort_order: 0 },
        { id: "g-cat-2", name: "Home", sort_order: 1 },
      ],
      items: [
        item({ id: "g-item-1", title: "KitchenAid Stand Mixer", category_id: "g-cat-1", price: 449, is_essential: true }),
        item({ id: "g-item-2", title: "Linen Napkins (Set of 8)", category_id: "g-cat-1", price: 64, quantity_needed: 2, quantity_fulfilled: 1, sort_order: 1 }),
        item({ id: "g-item-3", title: "Champagne Flutes (Set of 4)", category_id: "g-cat-1", price: 52, quantity_fulfilled: 1, sort_order: 2 }),
        item({ id: "g-item-4", title: "Weighted Throw Blanket", category_id: "g-cat-2", price: 129 }),
        item({ id: "g-item-5", title: "Emerald Velvet Pillows (Pair)", category_id: "g-cat-2", price: 58, sort_order: 1 }),
      ],
      cashFunds: [
        {
          id: "g-fund-1",
          title: "Honeymoon in Oz",
          description: "Help us see the Emerald City!",
          goal_amount: 3000,
          current_amount: 1150,
        },
      ],
    }),
    friendRegistry({
      id: "oz-christmas",
      slug: "oz-christmas-list",
      title: "Oz's Christmas List",
      registry_type: "personal",
      event_type: "christmas",
      event_date: demoChristmas(today),
      honoree_names: "Oz",
      description: "Ho ho ho. Nothing fancy!",
      is_public: true,
      owner: DEMO_OZ,
      categories: [{ id: "o-cat-1", name: "Wish list", sort_order: 0 }],
      items: [
        item({ id: "o-item-1", title: "Hot Air Balloon Ride Gift Card", category_id: "o-cat-1", price: 250, is_essential: true }),
        item({ id: "o-item-2", title: "Wool Top Hat", category_id: "o-cat-1", price: 75, sort_order: 1 }),
        item({ id: "o-item-3", title: "Magic Tricks Book", category_id: "o-cat-1", price: 22, quantity_fulfilled: 1, sort_order: 2 }),
        item({ id: "o-item-4", title: "Green Tea Sampler", category_id: "o-cat-1", price: 30, sort_order: 3 }),
      ],
    }),
    friendRegistry({
      id: "oz-birthday",
      slug: "oz-turns-60",
      title: "Oz Turns 60",
      registry_type: "personal",
      event_type: "birthday",
      event_date: addDays(today, -75),
      honoree_names: "Oz",
      description: null,
      is_public: true,
      owner: DEMO_OZ,
      categories: [{ id: "ob-cat-1", name: "Gifts", sort_order: 0 }],
      items: [
        item({ id: "ob-item-1", title: "Golf Lessons", category_id: "ob-cat-1", price: 180, quantity_fulfilled: 1 }),
        item({ id: "ob-item-2", title: "Leather Journal", category_id: "ob-cat-1", price: 45, quantity_fulfilled: 1, sort_order: 1 }),
        item({ id: "ob-item-3", title: "Bird-Watching Binoculars", category_id: "ob-cat-1", price: 120, sort_order: 2 }),
      ],
    }),
    friendRegistry({
      id: "elphie-wishlist",
      slug: "elphies-wishlist",
      title: "Elphie's Wishlist",
      registry_type: "personal",
      event_type: null,
      event_date: null,
      honoree_names: "Elphaba",
      description: "Things I'd love, any time of year.",
      is_public: true,
      owner: DEMO_ELPHABA,
      categories: [{ id: "e-cat-1", name: "Books", sort_order: 0 }],
      items: [
        item({ id: "e-item-1", title: "Broom Care Kit", category_id: "e-cat-1", price: 34 }),
        item({ id: "e-item-2", title: "Spell Book Bookends", category_id: "e-cat-1", price: 48, sort_order: 1 }),
        item({ id: "e-item-3", title: "Emerald Fountain Pen", category_id: "e-cat-1", price: 60, sort_order: 2 }),
      ],
    }),
    // Dorothy's kids' list, on the family Christmas. Remi & Max don't follow
    // Dorothy, but it's public, and the invitation links it.
    friendRegistry({
      id: "gale-kids",
      slug: "lily-and-sams-christmas-list",
      title: "Lily & Sam's Christmas List",
      registry_type: "personal",
      event_type: "christmas",
      event_date: demoChristmas(today),
      honoree_names: "Lily & Sam",
      description: "Lily is 7 and Sam is 4. They wrote most of this themselves!",
      is_public: true,
      owner: DEMO_DOROTHY,
      categories: [
        { id: "k-cat-1", name: "Lily (7)", sort_order: 0 },
        { id: "k-cat-2", name: "Sam (4)", sort_order: 1 },
      ],
      items: [
        item({
          id: "k-item-1",
          title: "LEGO Classic Creative Brick Box",
          category_id: "k-cat-1",
          image_url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=300&h=300&fit=crop",
          price: 60,
          is_essential: true,
        }),
        item({ id: "k-item-2", title: "Watercolor Paint Set", category_id: "k-cat-1", price: 25, quantity_fulfilled: 1, sort_order: 1 }),
        item({ id: "k-item-3", title: "Kids' Headphones (Purple)", category_id: "k-cat-1", price: 30, sort_order: 2 }),
        item({
          id: "k-item-4",
          title: "Magna-Tiles (32 pieces)",
          category_id: "k-cat-2",
          price: 50,
          is_essential: true,
          notes: "His favorite thing at preschool.",
        }),
        item({ id: "k-item-5", title: "Kick Scooter", category_id: "k-cat-2", price: 70, quantity_fulfilled: 1, sort_order: 1 }),
        item({
          id: "k-item-6",
          title: "Dinosaur Picture Books",
          category_id: "k-cat-2",
          price: 15,
          quantity_needed: 2,
          sort_order: 2,
        }),
      ],
    }),
  ];
}

/** Every registry in the demo. Remi & Max's own come first. */
export function demoRegistries(today: string): DemoRegistry[] {
  return [babyRegistry(today), birthdayWishlist(today), christmasList(today), ...friendsRegistries(today)];
}

/** The registries the demo account owns, newest first like the dashboard. */
export function demoOwnRegistries(today: string): DemoRegistry[] {
  return demoRegistries(today).filter((r) => r.owner.public_id === DEMO_ME.public_id);
}

export function findDemoRegistry(today: string, match: { id?: string; slug?: string }): DemoRegistry | null {
  return (
    demoRegistries(today).find(
      (r) => (match.id !== undefined && r.id === match.id) || (match.slug !== undefined && r.slug === match.slug),
    ) ?? null
  );
}

/** The share page for a demo registry. Remi & Max's baby registry lives at /demo. */
export function demoRegistryPath(registry: Pick<DemoRegistry, "slug">): string {
  return registry.slug === "remi-and-max" ? "/demo" : `/demo/r/${registry.slug}`;
}

export function toListed(registry: DemoRegistry): ListedRegistry {
  return {
    slug: registry.slug,
    title: registry.title,
    event_date: registry.event_date,
    registry_type: registry.registry_type,
    event_type: registry.event_type,
    is_public: registry.is_public,
  };
}

/**
 * The registries a profile shows to the demo account. Like the real profile
 * page: the owner and approved followers see private ones, everyone else
 * only public ones.
 */
export function demoProfileRegistries(today: string, owner: DemoPerson, canSeePrivate: boolean): ListedRegistry[] {
  return demoRegistries(today)
    .filter((r) => r.owner.public_id === owner.public_id && r.listed_on_profile && (canSeePrivate || r.is_public))
    .map(toListed);
}

/** The Following tab's registries: from people who approved the demo account. */
export function demoFeedRegistries(today: string, approvedIds: string[]): FeedRegistry[] {
  return demoRegistries(today)
    .filter((r) => approvedIds.includes(r.owner.public_id) && r.listed_on_profile)
    .map((r) => ({ ...toListed(r), owner: { public_id: r.owner.public_id, full_name: r.owner.full_name } }));
}
