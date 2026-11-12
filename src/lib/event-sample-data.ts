// A sample event and guest list for the Storybook stories. Dates are fixed, so
// snapshots don't change from day to day. Stories that need "today" use
// SAMPLE_TODAY, two weeks before the event.

import type { EventDetails, EventGuest, GiftExchange } from "@/lib/events";
import type { SignupClaim, SignupItem, SignupSheetWithRows } from "@/lib/signups";

export const SAMPLE_TODAY = "2026-02-28";

export const SAMPLE_INVITATION_URL = "/samples/invitation.svg";

/** The parents' registry the shower links. */
export const SAMPLE_REGISTRY_ID = "00000000-0000-4000-8000-000000000002";

export const sampleEvent: EventDetails = {
  id: "7d4c1f0e-2b5a-4c3d-9e8f-0a1b2c3d4e5f",
  owner_id: "00000000-0000-4000-8000-000000000001",
  slug: "remis-baby-shower-k3m9q2xa",
  event_type: "baby_shower",
  title: "Remi's Baby Shower",
  hosted_by: "Aunt Linda & Grandma Jo",
  event_date: "2026-03-14",
  start_time: "14:00:00",
  end_time: "17:00:00",
  time_zone: "America/Los_Angeles",
  location_name: "Grandma Jo's garden",
  location_address: "1450 Sunnyside Ave\nBerkeley, CA 94703",
  message:
    "Join us for tea, cake and games as we celebrate Remi and the baby on the way! Street parking is easiest. Bring a favorite children's book instead of a card.",
  image_url: SAMPLE_INVITATION_URL,
  rsvp_by: "2026-03-07",
  max_party_size: 2,
  open_rsvp: true,
  email_host_on_rsvp: true,
  gift_note: null,
  ask_kids: false,
  repeated_from: null,
  created_at: "2026-02-01T18:00:00Z",
  updated_at: "2026-02-01T18:00:00Z",
};

export const sampleRegistry = { title: "Remi & Max's Baby Registry", slug: "remi-and-max-baby" };

function guest(partial: Partial<EventGuest> & Pick<EventGuest, "id" | "name">): EventGuest {
  return {
    event_id: sampleEvent.id,
    email: null,
    token: `token-${partial.id}`,
    rsvp_status: "pending",
    party_size: 1,
    rsvp_note: null,
    responded_at: null,
    invited_at: null,
    reminded_at: null,
    added_by_guest: false,
    kids_count: 0,
    in_exchange: false,
    wishlist_url: null,
    gift_ideas: null,
    shipping_address: null,
    giftee_id: null,
    created_at: "2026-02-02T18:00:00Z",
    ...partial,
  };
}

export const sampleGuests: EventGuest[] = [
  guest({
    id: "g1",
    name: "Glinda Upland",
    email: "glinda@example.com",
    rsvp_status: "yes",
    party_size: 2,
    rsvp_note: "Wouldn't miss it! Bringing Goodnight Moon.",
    responded_at: "2026-02-05T17:00:00Z",
    invited_at: "2026-02-03T18:00:00Z",
  }),
  guest({
    id: "g2",
    name: "Elphaba Thropp",
    email: "elphie@example.com",
    rsvp_status: "maybe",
    party_size: 1,
    responded_at: "2026-02-06T17:00:00Z",
    invited_at: "2026-02-03T18:00:00Z",
  }),
  guest({
    id: "g3",
    name: "Nessa Thropp",
    email: "nessa@example.com",
    rsvp_status: "no",
    party_size: 0,
    rsvp_note: "So sorry, I'll be traveling. Sending love!",
    responded_at: "2026-02-04T17:00:00Z",
    invited_at: "2026-02-03T18:00:00Z",
  }),
  guest({
    id: "g4",
    name: "Fiyero Tigelaar",
    email: "fiyero@example.com",
    invited_at: "2026-02-03T18:00:00Z",
    reminded_at: "2026-02-20T18:00:00Z",
  }),
  guest({
    id: "g5",
    name: "Boq Woodsman",
    email: "boq@example.com",
    rsvp_status: "yes",
    party_size: 1,
    responded_at: "2026-02-10T17:00:00Z",
    added_by_guest: true,
  }),
  guest({ id: "g6", name: "Madame Morrible", email: "morrible@example.com" }),
  guest({ id: "g7", name: "Doctor Dillamond" }),
];

// ── Linked registries ────────────────────────────────────────

/**
 * Two registries the shower links: the parents' main registry (the same one
 * as sampleRegistry) and their list of books for the baby.
 */
export const sampleLinkedRegistries = [
  {
    id: SAMPLE_REGISTRY_ID,
    title: sampleRegistry.title,
    slug: sampleRegistry.slug,
    honoree: "Remi & Max",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    title: "Baby Remi's Bookshelf",
    slug: "baby-remis-bookshelf-7f2k",
    honoree: "Remi & Max",
  },
];

// ── A gift exchange ──────────────────────────────────────────

/** A holiday party with a gift exchange. The guests are the shower's guests. */
export const sampleExchangeEvent: EventDetails = {
  ...sampleEvent,
  id: "8e5d2a1f-3c4b-4d6e-8f90-1a2b3c4d5e6f",
  slug: "holiday-gift-swap-p4w8n2rt",
  event_type: "christmas",
  title: "Holiday Gift Swap",
  hosted_by: "Aunt Linda",
  event_date: "2026-12-19",
  start_time: "17:00:00",
  end_time: "21:00:00",
  location_name: "Aunt Linda's house",
  location_address: "88 Hillcrest Rd\nOakland, CA 94618",
  message: "Potluck dinner, then gifts by the tree. Bring a dish to share!",
  image_url: null,
  rsvp_by: "2026-12-01",
  max_party_size: 4,
  ask_kids: true,
};

/** The exchange before the draw. Gifts come to the party. */
export const sampleExchange: GiftExchange = {
  event_id: sampleExchangeEvent.id,
  budget: "$25",
  draw_by: "2026-12-05",
  mailed: false,
  drawn_at: null,
  created_at: "2026-11-01T18:00:00Z",
  updated_at: "2026-11-01T18:00:00Z",
};

// What changes for each guest on the holiday party's list. Five people are
// in the exchange. Doctor Dillamond has no email, and two guests bring kids.
const exchangeAnswers: Record<string, Partial<EventGuest>> = {
  g1: {
    party_size: 3,
    kids_count: 2,
    rsvp_note: "We'll bring dumplings!",
    in_exchange: true,
    wishlist_url: "https://regibee.com/r/glindas-wishlist-8h3m",
    gift_ideas: "Anything pink and sparkly",
  },
  g2: { in_exchange: true, gift_ideas: "Books about animals, green tea, a sturdy umbrella" },
  g4: {
    rsvp_status: "yes",
    party_size: 2,
    kids_count: 1,
    responded_at: "2026-11-20T17:00:00Z",
    in_exchange: true,
  },
  g5: { in_exchange: true },
  g7: { rsvp_status: "yes", responded_at: "2026-11-21T17:00:00Z", in_exchange: true },
};

/** The holiday party's guest list before the draw. */
export const sampleExchangeGuests: EventGuest[] = sampleGuests.map((g) => ({
  ...g,
  event_id: sampleExchangeEvent.id,
  ...exchangeAnswers[g.id],
}));

/** Elphaba and Fiyero are a couple, so they won't draw each other. */
export const sampleExchangeExclusions = [{ guest_a: "g2", guest_b: "g4" }];

/** The exchange after the draw. */
export const sampleDrawnExchange: GiftExchange = { ...sampleExchange, drawn_at: "2026-12-05T19:00:00Z" };

// Who drew whom: one loop through all five, and Elphaba and Fiyero don't draw each other.
const drawnPairs: Record<string, string> = { g1: "g4", g4: "g7", g7: "g5", g5: "g2", g2: "g1" };

/** The holiday party's guest list after the draw. */
export const sampleDrawnExchangeGuests: EventGuest[] = sampleExchangeGuests.map((g) => ({
  ...g,
  giftee_id: drawnPairs[g.id] ?? null,
}));

// ── Sign-up sheets ───────────────────────────────────────────

/** A potluck with a sign-up sheet. The guests are the shower's guests. */
export const samplePotluckEvent: EventDetails = {
  ...sampleEvent,
  id: "9f6e3b2a-4d5c-4e7f-9a01-2b3c4d5e6f70",
  slug: "friendsgiving-potluck-r7t2m9wq",
  event_type: "potluck",
  title: "Friendsgiving Potluck",
  hosted_by: "Glinda & Elphaba",
  event_date: "2026-11-21",
  start_time: "16:00:00",
  end_time: "21:00:00",
  location_name: "The Emerald Apartment",
  location_address: "12 Yellow Brick Rd, Apt 3\nSan Francisco, CA 94110",
  message: "We'll do the turkey. You bring the rest!",
  image_url: null,
  rsvp_by: "2026-11-14",
  max_party_size: 2,
};

function signupItem(id: string, label: string, needed: number, sortOrder: number, slotDate: string | null = null): SignupItem {
  return {
    id,
    event_id: samplePotluckEvent.id,
    label,
    needed,
    slot_date: slotDate,
    sort_order: sortOrder,
    created_at: "2026-11-01T18:00:00Z",
  };
}

function signupClaim(itemId: string, guestId: string, note: string | null, at: string): SignupClaim {
  return { item_id: itemId, guest_id: guestId, note, created_at: at };
}

/** Glinda brings a side, Boq the only dessert, and Elphaba (a maybe) some drinks. */
export const samplePotluckSheet: SignupSheetWithRows = {
  sheet: {
    event_id: samplePotluckEvent.id,
    title: "Bring a dish",
    note: "Pick what you'll bring and say what it is, so we don't end up with five pasta salads.",
    created_at: "2026-11-01T18:00:00Z",
    updated_at: "2026-11-01T18:00:00Z",
  },
  items: [
    signupItem("s1", "Main dish", 2, 0),
    signupItem("s2", "Side", 3, 1),
    signupItem("s3", "Dessert", 1, 2),
    signupItem("s4", "Drinks", 2, 3),
  ],
  claims: [
    signupClaim("s2", "g1", "Mac and cheese", "2026-11-03T18:00:00Z"),
    signupClaim("s3", "g5", "Pumpkin pie", "2026-11-04T18:00:00Z"),
    signupClaim("s4", "g2", "Sparkling cider", "2026-11-05T18:00:00Z"),
  ],
};

/** A meal train for new parents. Its address shows only to people who sign up. */
export const sampleMealTrainEvent: EventDetails = {
  ...sampleEvent,
  id: "0a7f4c3b-5e6d-4f80-8b12-3c4d5e6f7081",
  slug: "meals-for-remi-and-max-c5h8k2pz",
  event_type: "meal_train",
  title: "Meals for Remi & Max",
  hosted_by: "Aunt Linda",
  event_date: null,
  start_time: null,
  end_time: null,
  location_name: null,
  location_address: "1450 Sunnyside Ave\nBerkeley, CA 94703",
  message: "Remi and Max are home with the baby! Drop off between 5 and 6. They're vegetarian.",
  image_url: null,
  rsvp_by: null,
};

/** The first week of dinners, starting the day after SAMPLE_TODAY. Glinda has Monday. */
export const sampleMealTrainSheet: SignupSheetWithRows = {
  sheet: {
    event_id: sampleMealTrainEvent.id,
    title: "Meals",
    note: "Pick a day to drop off a meal. You'll see the address once you sign up.",
    created_at: "2026-02-20T18:00:00Z",
    updated_at: "2026-02-20T18:00:00Z",
  },
  items: [
    { ...signupItem("m1", "Dinner", 1, 0, "2026-03-01"), event_id: sampleMealTrainEvent.id },
    { ...signupItem("m2", "Dinner", 1, 1, "2026-03-02"), event_id: sampleMealTrainEvent.id },
    { ...signupItem("m3", "Dinner", 1, 2, "2026-03-03"), event_id: sampleMealTrainEvent.id },
    { ...signupItem("m4", "Dinner", 1, 3, "2026-03-04"), event_id: sampleMealTrainEvent.id },
  ],
  claims: [signupClaim("m2", "g1", "Veggie lasagna", "2026-02-21T18:00:00Z")],
};
