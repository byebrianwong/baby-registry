// The demo's events: a baby shower that Glinda hosts and Remi & Max co-host,
// Max's birthday dinner, and a housewarming that's already happened. Dates
// count from `today` (YYYY-MM-DD), like the rest of the demo.

import { addDays, DEMO_REGISTRY } from "@/lib/demo-data";
import type { EventDetails, EventGuest, RsvpStatus } from "@/lib/events";

export interface DemoEvent extends EventDetails {
  guests: EventGuest[];
}

/** The owner id of the demo account's own events. Others are co-hosted. */
export const DEMO_ME_ID = "me";

function at(today: string, days: number, time = "17:00"): string {
  return `${addDays(today, days)}T${time}:00Z`;
}

type GuestInput = {
  id: string;
  name: string;
  email?: string | null;
  status?: RsvpStatus;
  partySize?: number;
  note?: string | null;
  /** Days ago, or null for never. */
  invited?: number | null;
  reminded?: number | null;
  responded?: number | null;
  addedByGuest?: boolean;
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
      created_at: at(today, -14),
    };
  });
}

function babyShower(today: string): DemoEvent {
  const id = "baby-shower";
  return {
    id,
    // Glinda made the event. Remi & Max manage the registry it links to, so
    // they can manage it too, and see it as co-hosts.
    owner_id: "glinda",
    registry_id: "baby",
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
      "Join us for tea, cake and games as we celebrate Remi & Max and the baby on the way! Street parking is easiest. Bring a favorite children's book instead of a card.",
    image_url: "/demo/baby-shower-invitation.svg",
    rsvp_by: addDays(today, 18),
    max_party_size: 3,
    open_rsvp: true,
    email_host_on_rsvp: true,
    created_at: at(today, -14),
    updated_at: at(today, -14),
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
      },
      { id: "s2", name: "Oz Diggs", email: "oz@example.com", status: "yes", invited: 12, responded: 8 },
      {
        id: "s3",
        name: "Priya Shah",
        email: "priya@example.com",
        status: "yes",
        partySize: 3,
        note: "Bringing the twins!",
        invited: 12,
        responded: 7,
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

function birthdayDinner(today: string): DemoEvent {
  const id = "max-30th";
  return {
    id,
    owner_id: DEMO_ME_ID,
    registry_id: "wishlist",
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
    id,
    owner_id: DEMO_ME_ID,
    registry_id: null,
    slug: "remi-and-max-housewarming",
    event_type: "housewarming",
    title: "Come See Our New Place",
    hosted_by: "Remi & Max",
    event_date: addDays(today, -150),
    start_time: "18:00:00",
    end_time: "21:00:00",
    time_zone: "America/Los_Angeles",
    location_name: "Our new place",
    location_address: DEMO_REGISTRY.settings.shipping_address.split("\n").slice(1).join("\n"),
    message: "Snacks, drinks and a tour of the new place. No gifts needed!",
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

/** Soonest first, then past events, like the Events tab. */
export function demoEvents(today: string): DemoEvent[] {
  return [babyShower(today), birthdayDinner(today), housewarming(today)];
}

export function findDemoEvent(today: string, match: { id?: string; slug?: string }): DemoEvent | null {
  return (
    demoEvents(today).find(
      (e) => (match.id !== undefined && e.id === match.id) || (match.slug !== undefined && e.slug === match.slug),
    ) ?? null
  );
}

/** Events that link guests to a demo registry, for its banner. */
export function demoEventsForRegistry(today: string, registryId: string): DemoEvent[] {
  return demoEvents(today).filter((e) => e.registry_id === registryId);
}
