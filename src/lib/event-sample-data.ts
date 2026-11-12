// A sample event and guest list for the Storybook stories. Dates are fixed, so
// snapshots don't change from day to day. Stories that need "today" use
// SAMPLE_TODAY, two weeks before the event.

import type { EventDetails, EventGuest, GiftExchange, GuestWishList } from "@/lib/events";

export const SAMPLE_TODAY = "2026-02-28";

export const SAMPLE_INVITATION_URL = "/samples/invitation.svg";

export const sampleEvent: EventDetails = {
  id: "7d4c1f0e-2b5a-4c3d-9e8f-0a1b2c3d4e5f",
  owner_id: "00000000-0000-4000-8000-000000000001",
  registry_id: "00000000-0000-4000-8000-000000000002",
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
    id: sampleEvent.registry_id!,
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
  registry_id: null,
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

// ── Everyone gives everyone ──────────────────────────────────

/** The same holiday party, where everyone gives everyone instead of drawing names. */
export const sampleEveryoneExchange: GiftExchange = {
  ...sampleExchange,
  kind: "everyone",
  draw_by: null,
};

/** Everyone's wish lists, as Glinda sees them on her own invitation link. */
export const sampleGuestWishLists: GuestWishList[] = [
  {
    guestId: "g1",
    name: "Glinda",
    isYou: true,
    url: "https://regibee.com/r/glindas-wishlist-8h3m",
    registry: { title: "Glinda's Christmas List", slug: "glindas-wishlist-8h3m" },
    giftIdeas: null,
  },
  {
    guestId: "g2",
    name: "Elphaba Thropp",
    isYou: false,
    url: "https://regibee.com/r/elphabas-list-2k9d",
    registry: { title: "Elphaba's Christmas List", slug: "elphabas-list-2k9d" },
    giftIdeas: "Books about animals, green tea, a sturdy umbrella",
  },
  {
    guestId: "g4",
    name: "Fiyero",
    isYou: false,
    url: "https://www.amazon.com/hz/wishlist/ls/EXAMPLE123",
    registry: null,
    giftIdeas: null,
  },
  { guestId: "g5", name: "Boq", isYou: false, url: null, registry: null, giftIdeas: null },
];
