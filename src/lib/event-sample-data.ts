// A sample event and guest list for the Storybook stories. Dates are fixed, so
// snapshots don't change from day to day. Stories that need "today" use
// SAMPLE_TODAY, two weeks before the event.

import type { EventDetails, EventGuest } from "@/lib/events";

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
