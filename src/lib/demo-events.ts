// The demo's events. Two sets, so people can try both kinds of celebration:
//
// - A baby: the shower Glinda hosts with Remi & Max as co-hosts, and the meal
//   train she set up for after the birth.
// - A family Christmas: dinner at Remi & Max's where everyone gives everyone,
//   and a Secret Santa with friends whose names are already drawn.
//
// Plus Max's birthday dinner and a housewarming that's already happened.
// Dates count from `today` (YYYY-MM-DD), like the rest of the demo.

import { addDays, DEMO_REGISTRY, demoDueDate } from "@/lib/demo-data";
import { demoChristmas } from "@/lib/demo-registries";
import type { EventDetails, EventGuest, GiftExchange, RsvpStatus } from "@/lib/events";
import type { EventMessage, MessageAudience } from "@/lib/event-updates";
import type { RsvpAnswers, RsvpQuestion } from "@/lib/rsvp-questions";
import type { SignupSheetWithRows } from "@/lib/signups";

export interface DemoHost {
  userId: string;
  name: string;
  isOwner: boolean;
}

export interface DemoEvent extends EventDetails {
  /** The demo registry the event links to, if any. */
  registryId: string | null;
  guests: EventGuest[];
  /** Who hosts it. The demo account is DEMO_ME_ID. */
  hosts: DemoHost[];
  exchange: GiftExchange | null;
  /** Pairs who shouldn't draw each other in the exchange. */
  exclusions: { guest_a: string; guest_b: string }[];
  signup: SignupSheetWithRows | null;
  /** What was emailed to guests after the invitation, newest first. */
  messages: EventMessage[];
}

/** The demo account's id as a host. */
export const DEMO_ME_ID = "me";

const ME: DemoHost = { userId: DEMO_ME_ID, name: "Remi & Max", isOwner: true };

/** Whether Remi & Max host the event, as its owner or a co-host. */
export function isDemoHost(event: Pick<DemoEvent, "hosts">): boolean {
  return event.hosts.some((h) => h.userId === DEMO_ME_ID);
}

function at(today: string, days: number, time = "17:00"): string {
  return `${addDays(today, days)}T${time}:00Z`;
}

/** "January 27", as a guest would type it. */
function monthAndDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

const HOME_ADDRESS = DEMO_REGISTRY.settings.shipping_address.split("\n").slice(1).join("\n");

/** A guest's wish list link, when it's one of the demo's lists. It works on the live site. */
function listLink(slug: string): string {
  return `https://regibee.com/demo/r/${slug}`;
}

type GuestInput = {
  id: string;
  name: string;
  email?: string | null;
  status?: RsvpStatus;
  partySize?: number;
  kids?: number;
  note?: string | null;
  /** Days ago, or null for never. */
  invited?: number | null;
  reminded?: number | null;
  responded?: number | null;
  addedByGuest?: boolean;
  answers?: RsvpAnswers;
  /** In the gift exchange. */
  inExchange?: boolean;
  /** A demo registry's slug and id, for a Regibee wish list. */
  list?: { slug: string; id: string };
  /** Any other store's list. */
  listUrl?: string;
  giftIdeas?: string;
  /** Who they drew in the exchange, by guest id. */
  giftee?: string;
};

function guests(today: string, eventId: string, list: GuestInput[]): EventGuest[] {
  return list.map((g) => {
    const status = g.status ?? "pending";
    return {
      id: g.id,
      event_id: eventId,
      name: g.name,
      email: g.email ?? null,
      token: `demo-${g.id}`,
      rsvp_status: status,
      party_size: status === "no" ? 0 : (g.partySize ?? 1),
      rsvp_note: g.note ?? null,
      responded_at: g.responded != null ? at(today, -g.responded, "19:30") : null,
      invited_at: g.invited != null ? at(today, -g.invited) : null,
      reminded_at: g.reminded != null ? at(today, -g.reminded, "16:00") : null,
      added_by_guest: g.addedByGuest ?? false,
      kids_count: g.kids ?? 0,
      in_exchange: g.inExchange ?? false,
      wishlist_url: g.list ? listLink(g.list.slug) : (g.listUrl ?? null),
      wishlist_registry_id: g.list?.id ?? null,
      gift_ideas: g.giftIdeas ?? null,
      shipping_address: null,
      giftee_id: g.giftee ?? null,
      answers: g.answers ?? {},
      created_at: at(today, -14),
    };
  });
}

function message(
  today: string,
  eventId: string,
  partial: { id: string; audience: MessageAudience; subject: string; body: string | null; recipients: number; daysAgo: number; kind?: EventMessage["kind"] },
): EventMessage {
  return {
    id: partial.id,
    event_id: eventId,
    sent_by: DEMO_ME_ID,
    kind: partial.kind ?? "message",
    audience: partial.audience,
    subject: partial.subject,
    body: partial.body,
    recipients: partial.recipients,
    created_at: at(today, -partial.daysAgo, "18:00"),
  };
}

const DIET_QUESTION: RsvpQuestion = {
  id: "diet",
  kind: "diet",
  label: "Allergies or dietary needs",
  required: false,
  options: [],
};

/** Fields most demo events leave at their defaults. */
const PLAIN = {
  gift_note: null,
  ask_kids: false,
  repeated_from: null,
  rsvp_questions: [] as RsvpQuestion[],
  remind_day_before: true,
  exchange: null,
  exclusions: [],
  signup: null,
  messages: [] as EventMessage[],
};

// ── A baby ───────────────────────────────────────────────────

function babyShower(today: string): DemoEvent {
  const id = "baby-shower";
  return {
    ...PLAIN,
    id,
    // Glinda made the event and added Remi & Max and Dorothy as co-hosts.
    owner_id: "glinda",
    hosts: [
      { userId: "glinda", name: "Glinda Upland", isOwner: true },
      { userId: "dorothy", name: "Dorothy Gale", isOwner: false },
      { ...ME, isOwner: false },
    ],
    registryId: "baby",
    slug: "remi-and-max-baby-shower",
    event_type: "baby_shower",
    title: "Remi & Max's Baby Shower",
    hosted_by: "Glinda Upland & Dorothy Gale",
    event_date: addDays(today, 28),
    start_time: "14:00:00",
    end_time: "17:00:00",
    time_zone: "America/Los_Angeles",
    location_name: "Glinda's house",
    location_address: "456 Emerald Ave\nSan Francisco, CA 94110",
    message:
      "Join us for tea, cake and games as we celebrate Remi & Max and the baby on the way! Street parking is easiest.",
    gift_note: "Instead of a card, bring a favorite children's book with a note inside.",
    image_url: "/demo/baby-shower-invitation.svg",
    rsvp_by: addDays(today, 18),
    max_party_size: 3,
    open_rsvp: true,
    email_host_on_rsvp: true,
    ask_kids: true,
    rsvp_questions: [
      DIET_QUESTION,
      { id: "guess", kind: "text", label: "Guess the baby's birthday!", required: false, options: [] },
    ],
    created_at: at(today, -14),
    updated_at: at(today, -14),
    messages: [
      message(today, id, {
        id: "m1",
        audience: "going",
        subject: "Parking for the shower",
        body: "Hi all! The street out front is permit-only on weekends, so park on Valencia and walk up. See you soon!",
        recipients: 4,
        daysAgo: 2,
      }),
    ],
    guests: guests(today, id, [
      {
        id: "s1",
        name: "Dorothy Gale",
        email: "dorothy@example.com",
        status: "yes",
        partySize: 2,
        note: "Henry and I will be there with bells on!",
        invited: 12,
        responded: 11,
        answers: { guess: monthAndDay(addDays(demoDueDate(today), 4)) },
      },
      {
        id: "s2",
        name: "Oz Diggs",
        email: "oz@example.com",
        status: "yes",
        invited: 12,
        responded: 8,
        answers: { diet: "No shellfish, please" },
      },
      {
        id: "s3",
        name: "Priya Shah",
        email: "priya@example.com",
        status: "yes",
        partySize: 3,
        kids: 2,
        note: "Bringing the twins!",
        invited: 12,
        responded: 7,
        answers: { diet: "The twins are vegetarian", guess: "A week early!" },
      },
      {
        id: "s4",
        name: "Taylor Brooks",
        email: "taylor@example.com",
        status: "yes",
        note: "Glinda sent me the link. Can't wait!",
        responded: 4,
        addedByGuest: true,
      },
      {
        id: "s5",
        name: "Elphaba Thropp",
        email: "elphie@example.com",
        status: "maybe",
        note: "Trying to move a work trip.",
        invited: 12,
        responded: 9,
        answers: { diet: "Gluten-free" },
      },
      {
        id: "s6",
        name: "Nessa Thropp",
        email: "nessa@example.com",
        status: "no",
        note: "So sorry to miss it. Sending love!",
        invited: 12,
        responded: 10,
      },
      { id: "s7", name: "Alex Kim", email: "alex@example.com", invited: 12, reminded: 3 },
      { id: "s8", name: "Jordan Lee", email: "jordan@example.com", invited: 12 },
      { id: "s9", name: "Sam Rivera", email: "sam@example.com", invited: 12 },
      // No email: the hosts text this guest their RSVP link.
      { id: "s10", name: "Great-Aunt Em" },
    ]),
  };
}

/**
 * Dinners for after the baby comes. Glinda hosts it and links the baby
 * registry, so Remi & Max see it under "Celebrating you", as guests do.
 * Its address shows only to people who sign up for a day.
 */
function mealTrain(today: string): DemoEvent {
  const id = "meal-train";
  const firstDay = addDays(demoDueDate(today), 3);
  const day = (n: number) => addDays(firstDay, n);
  const created = at(today, -5);
  const row = (n: number) => ({
    id: `mt${n + 1}`,
    event_id: id,
    label: "Dinner",
    needed: 1,
    slot_date: day(n),
    sort_order: n,
    created_at: created,
  });
  return {
    ...PLAIN,
    id,
    owner_id: "glinda",
    hosts: [{ userId: "glinda", name: "Glinda Upland", isOwner: true }],
    registryId: "baby",
    slug: "meals-for-remi-and-max",
    event_type: "meal_train",
    title: "Meals for Remi & Max",
    hosted_by: "Glinda Upland",
    event_date: null,
    start_time: null,
    end_time: null,
    time_zone: "America/Los_Angeles",
    location_name: "Remi & Max's place",
    location_address: HOME_ADDRESS,
    message:
      "Remi & Max will be home with the baby soon! Pick a night to drop off dinner between 5 and 6. They're vegetarian, and Max can't have nuts. Leave it at the door and text them.",
    image_url: null,
    rsvp_by: null,
    max_party_size: 1,
    open_rsvp: true,
    email_host_on_rsvp: true,
    remind_day_before: false,
    created_at: created,
    updated_at: created,
    signup: {
      sheet: {
        event_id: id,
        title: "Meals",
        note: "Pick a night to drop off dinner. You'll see the address once you sign up.",
        created_at: created,
        updated_at: created,
      },
      items: [0, 1, 2, 3, 4, 5, 6].map(row),
      claims: [
        { item_id: "mt1", guest_id: "mt-g1", note: "Veggie lasagna", created_at: at(today, -4) },
        { item_id: "mt3", guest_id: "mt-g2", note: "Black bean enchiladas", created_at: at(today, -3) },
        { item_id: "mt4", guest_id: "mt-g3", note: "Dal, rice and naan", created_at: at(today, -2) },
      ],
    },
    guests: guests(today, id, [
      { id: "mt-g1", name: "Glinda Upland", email: "glinda@example.com", status: "yes", invited: 5, responded: 4 },
      { id: "mt-g2", name: "Dorothy Gale", email: "dorothy@example.com", status: "yes", invited: 5, responded: 3 },
      { id: "mt-g3", name: "Priya Shah", email: "priya@example.com", status: "yes", invited: 5, responded: 2 },
      { id: "mt-g4", name: "Oz Diggs", email: "oz@example.com", invited: 5 },
      {
        id: "mt-g5",
        name: "Elphaba Thropp",
        email: "elphie@example.com",
        status: "no",
        note: "Away that week, so a dinner delivery gift card is on its way instead!",
        invited: 5,
        responded: 3,
      },
    ]),
  };
}

// ── A family Christmas ───────────────────────────────────────

/**
 * Christmas dinner at Remi & Max's, where everyone gives everyone: each
 * guest links a wish list, and sees the others' lists on the invitation.
 * Guests bring a dish from the sign-up sheet.
 */
function familyChristmas(today: string): DemoEvent {
  const id = "christmas";
  const christmas = demoChristmas(today);
  const created = at(today, -20);
  const row = (n: number, label: string, needed: number) => ({
    id: `fc${n + 1}`,
    event_id: id,
    label,
    needed,
    slot_date: null,
    sort_order: n,
    created_at: created,
  });
  return {
    ...PLAIN,
    id,
    owner_id: DEMO_ME_ID,
    hosts: [ME],
    registryId: null,
    slug: "family-christmas",
    event_type: "christmas",
    title: "Family Christmas",
    hosted_by: "Remi & Max",
    event_date: christmas,
    start_time: "13:00:00",
    end_time: "19:00:00",
    time_zone: "America/Los_Angeles",
    location_name: "Remi & Max's place",
    location_address: HOME_ADDRESS,
    message:
      "Christmas at our place this year! We'll do the turkey, so pick something to bring below. Add your wish list when you RSVP, and you'll see everyone else's and what's already been picked, so nobody doubles up.",
    gift_note: "Kids first, then everyone else. Wrapped gifts go under the tree when you arrive.",
    image_url: null,
    rsvp_by: addDays(christmas, -14),
    max_party_size: 6,
    open_rsvp: false,
    email_host_on_rsvp: true,
    ask_kids: true,
    rsvp_questions: [DIET_QUESTION],
    created_at: created,
    updated_at: created,
    exchange: {
      event_id: id,
      kind: "everyone",
      budget: "$50",
      draw_by: null,
      mailed: false,
      drawn_at: null,
      created_at: created,
      updated_at: created,
    },
    signup: {
      sheet: {
        event_id: id,
        title: "Bring a dish",
        note: "We've got the turkey and the stuffing. Pick what you'll bring and say what it is.",
        created_at: created,
        updated_at: created,
      },
      items: [row(0, "Appetizer", 2), row(1, "Side", 3), row(2, "Dessert", 2), row(3, "Drinks", 2)],
      claims: [
        { item_id: "fc3", guest_id: "c2", note: "Grandma Jo's pecan pie", created_at: at(today, -9) },
        { item_id: "fc2", guest_id: "c3", note: "Green bean casserole", created_at: at(today, -8) },
        { item_id: "fc4", guest_id: "c3", note: "Eggnog, with and without", created_at: at(today, -8) },
        { item_id: "fc1", guest_id: "c4", note: "Cheese board", created_at: at(today, -6) },
      ],
    },
    messages: [
      message(today, id, {
        id: "m1",
        audience: "not_declined",
        subject: "Add your wish lists!",
        body: "Remember to add your wish list when you RSVP, so everyone can start shopping. Kids' lists too!",
        recipients: 5,
        daysAgo: 7,
      }),
    ],
    guests: guests(today, id, [
      // The hosts are on their own list, so their wish list shows too.
      {
        id: "c1",
        name: "Remi & Max",
        email: "demo@example.com",
        status: "yes",
        partySize: 2,
        invited: 18,
        responded: 18,
        inExchange: true,
        list: { slug: "remi-and-max-christmas", id: "christmas-list" },
      },
      {
        id: "c2",
        name: "Oz Diggs",
        email: "oz@example.com",
        status: "yes",
        partySize: 2,
        note: "Jo and I will bring the pie!",
        invited: 18,
        responded: 16,
        inExchange: true,
        list: { slug: "oz-christmas-list", id: "oz-christmas" },
      },
      {
        id: "c3",
        name: "Dorothy Gale",
        email: "dorothy@example.com",
        status: "yes",
        partySize: 4,
        kids: 2,
        note: "The kids are SO excited.",
        invited: 18,
        responded: 15,
        inExchange: true,
        list: { slug: "lily-and-sams-christmas-list", id: "gale-kids" },
        giftIdeas: "For Henry and me: a nice olive oil, or anything for the garden",
        answers: { diet: "Henry is gluten-free" },
      },
      {
        id: "c4",
        name: "Elphaba Thropp",
        email: "elphie@example.com",
        status: "yes",
        invited: 18,
        responded: 12,
        inExchange: true,
        list: { slug: "elphies-wishlist", id: "elphie-wishlist" },
        giftIdeas: "Green tea, books about animals, a sturdy umbrella",
        answers: { diet: "Gluten-free" },
      },
      { id: "c5", name: "Nessa Thropp", email: "nessa@example.com", invited: 18, reminded: 4 },
      // No email: the hosts text her RSVP link.
      { id: "c6", name: "Great-Aunt Em" },
    ]),
  };
}

/**
 * A Secret Santa with friends, which Remi & Max host with Glinda. Names were
 * drawn two days ago. Each person sees who they drew on their own link; the
 * hosts never see who drew whom.
 */
function secretSanta(today: string): DemoEvent {
  const id = "secret-santa";
  const party = addDays(demoChristmas(today), -6);
  const created = at(today, -25);
  return {
    ...PLAIN,
    id,
    owner_id: DEMO_ME_ID,
    hosts: [ME, { userId: "glinda", name: "Glinda Upland", isOwner: false }],
    registryId: null,
    slug: "friendsmas-secret-santa",
    event_type: "gift_exchange",
    title: "Friendsmas Secret Santa",
    hosted_by: "Remi, Max & Glinda",
    event_date: party,
    start_time: "18:00:00",
    end_time: "22:00:00",
    time_zone: "America/Los_Angeles",
    location_name: "Glinda's house",
    location_address: "456 Emerald Ave\nSan Francisco, CA 94110",
    message: "Ugly sweaters encouraged. Bring your wrapped gift with the name on the tag, and we'll open them together.",
    image_url: null,
    rsvp_by: addDays(party, -21),
    max_party_size: 1,
    open_rsvp: false,
    email_host_on_rsvp: true,
    created_at: created,
    updated_at: created,
    exchange: {
      event_id: id,
      kind: "draw",
      budget: "$30",
      // The planned day. They drew early.
      draw_by: addDays(party, -14),
      mailed: false,
      drawn_at: at(today, -2, "20:00"),
      created_at: created,
      updated_at: created,
    },
    // Glinda and Fiyero are a couple, so they don't draw each other.
    exclusions: [{ guest_a: "ss2", guest_b: "ss3" }],
    // One loop through all six: ss1 → ss5 → ss2 → ss4 → ss3 → ss6 → ss1.
    guests: guests(today, id, [
      {
        id: "ss1",
        name: "Remi & Max",
        email: "demo@example.com",
        status: "yes",
        invited: 24,
        responded: 24,
        inExchange: true,
        list: { slug: "remi-and-max-christmas", id: "christmas-list" },
        giftee: "ss5",
      },
      {
        id: "ss2",
        name: "Glinda Upland",
        email: "glinda@example.com",
        status: "yes",
        responded: 23,
        inExchange: true,
        giftIdeas: "Anything pink and sparkly. Bubble bath!",
        giftee: "ss4",
      },
      {
        id: "ss3",
        name: "Fiyero Tigelaar",
        email: "fiyero@example.com",
        status: "yes",
        invited: 24,
        responded: 20,
        inExchange: true,
        listUrl: "https://www.amazon.com/hz/wishlist/ls/EXAMPLE123",
        giftee: "ss6",
      },
      {
        id: "ss4",
        name: "Elphaba Thropp",
        email: "elphie@example.com",
        status: "yes",
        invited: 24,
        responded: 18,
        inExchange: true,
        list: { slug: "elphies-wishlist", id: "elphie-wishlist" },
        giftee: "ss3",
      },
      {
        id: "ss5",
        name: "Oz Diggs",
        email: "oz@example.com",
        status: "yes",
        invited: 24,
        responded: 17,
        inExchange: true,
        list: { slug: "oz-christmas-list", id: "oz-christmas" },
        giftee: "ss2",
      },
      {
        id: "ss6",
        name: "Taylor Brooks",
        email: "taylor@example.com",
        status: "yes",
        invited: 24,
        responded: 10,
        inExchange: true,
        giftIdeas: "Coffee beans, cozy socks, a good mystery novel",
        giftee: "ss1",
      },
      {
        id: "ss7",
        name: "Nessa Thropp",
        email: "nessa@example.com",
        status: "no",
        note: "Traveling that week. Have fun!",
        invited: 24,
        responded: 19,
      },
    ]),
  };
}

// ── Others ───────────────────────────────────────────────────

function birthdayDinner(today: string): DemoEvent {
  const id = "max-30th";
  return {
    ...PLAIN,
    id,
    owner_id: DEMO_ME_ID,
    hosts: [ME],
    registryId: "wishlist",
    slug: "max-turns-30-dinner",
    event_type: "birthday",
    title: "Max Turns 30",
    hosted_by: "Remi",
    event_date: addDays(today, 40),
    start_time: "19:00:00",
    end_time: "22:00:00",
    time_zone: "America/Los_Angeles",
    location_name: "Emerald City Supper Club",
    location_address: "88 Yellow Brick Rd\nSan Francisco, CA 94107",
    message: "Dinner and drinks to celebrate Max turning 30. Partners welcome!",
    image_url: null,
    rsvp_by: addDays(today, 30),
    max_party_size: 2,
    // Only people with their own RSVP link can answer.
    open_rsvp: false,
    email_host_on_rsvp: true,
    created_at: at(today, -3),
    updated_at: at(today, -3),
    guests: guests(today, id, [
      { id: "b1", name: "Glinda Upland", email: "glinda@example.com", status: "yes", partySize: 2, invited: 2, responded: 1 },
      { id: "b2", name: "Oz Diggs", email: "oz@example.com", status: "maybe", invited: 2, responded: 1 },
      { id: "b3", name: "Henry Gale", email: "henry@example.com", invited: 2 },
      // Added, but not sent the invitation yet.
      { id: "b4", name: "Dorothy Gale", email: "dorothy@example.com" },
      { id: "b5", name: "Elphaba Thropp", email: "elphie@example.com" },
      { id: "b6", name: "Priya Shah", email: "priya@example.com" },
      { id: "b7", name: "Jordan Lee", email: "jordan@example.com" },
    ]),
  };
}

function housewarming(today: string): DemoEvent {
  const id = "housewarming";
  return {
    ...PLAIN,
    id,
    owner_id: DEMO_ME_ID,
    hosts: [ME],
    registryId: null,
    slug: "remi-and-max-housewarming",
    event_type: "housewarming",
    title: "Come See Our New Place",
    hosted_by: "Remi & Max",
    event_date: addDays(today, -150),
    start_time: "18:00:00",
    end_time: "21:00:00",
    time_zone: "America/Los_Angeles",
    location_name: "Our new place",
    location_address: HOME_ADDRESS,
    message: "Snacks, drinks and a tour of the new place.",
    gift_note: "No gifts, please. Your company is the best present.",
    image_url: null,
    rsvp_by: null,
    max_party_size: 2,
    open_rsvp: true,
    email_host_on_rsvp: false,
    created_at: at(today, -180),
    updated_at: at(today, -180),
    guests: guests(today, id, [
      { id: "h1", name: "Glinda Upland", email: "glinda@example.com", status: "yes", partySize: 2, invited: 175, responded: 174 },
      { id: "h2", name: "Oz Diggs", email: "oz@example.com", status: "yes", invited: 175, responded: 170 },
      { id: "h3", name: "Dorothy Gale", email: "dorothy@example.com", status: "yes", partySize: 2, invited: 175, responded: 172 },
      { id: "h4", name: "Elphaba Thropp", email: "elphie@example.com", status: "no", invited: 175, responded: 171 },
      { id: "h5", name: "Priya Shah", email: "priya@example.com", status: "yes", invited: 175, responded: 165 },
    ]),
  };
}

/** Every demo event, soonest first, then past ones. */
export function demoEvents(today: string): DemoEvent[] {
  return [
    babyShower(today),
    birthdayDinner(today),
    mealTrain(today),
    secretSanta(today),
    familyChristmas(today),
    housewarming(today),
  ].sort(
    (a, b) =>
      // No date (the meal train) goes after the dated ones.
      (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"),
  );
}

export function findDemoEvent(today: string, match: { id?: string; slug?: string }): DemoEvent | null {
  return (
    demoEvents(today).find(
      (e) => (match.id !== undefined && e.id === match.id) || (match.slug !== undefined && e.slug === match.slug),
    ) ?? null
  );
}

/**
 * Events that link guests to a demo registry, for its banner. Remi & Max
 * manage the ones they host; the others they can only see, or unlink.
 */
export function demoEventsForRegistry(today: string, registryId: string) {
  return demoEvents(today)
    .filter((e) => e.registryId === registryId)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      event_date: e.event_date,
      event_type: e.event_type,
      canManage: isDemoHost(e),
    }));
}
