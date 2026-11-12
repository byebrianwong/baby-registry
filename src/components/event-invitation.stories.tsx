import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { EventInvitation, type InvitationRegistry } from "./event-invitation";
import { RsvpForm } from "./rsvp-form";
import { GuestWishLists } from "./guest-wish-lists";
import {
  SAMPLE_TODAY,
  sampleEvent,
  sampleEveryoneExchange,
  sampleExchange,
  sampleExchangeEvent,
  sampleGuestWishLists,
  sampleLinkedRegistries,
  sampleMealTrainEvent,
  sampleMealTrainSheet,
  samplePotluckEvent,
  samplePotluckSheet,
  sampleRegistry,
} from "@/lib/event-sample-data";
import { signupRowsForGuest, withAddressFor } from "@/lib/signups";

// The public event page (src/app/e/[slug]/page.tsx) without its header and
// footer. The page reads the event on the server, which Storybook can't render.

const submitAction = fn(async () => ({ error: "This is a story, so nothing was saved." }));

const calendar = { google: "https://calendar.google.com/calendar/render", ics: "#" };

const meta: Meta<typeof EventInvitation> = {
  title: "Pages/Event Invitation (Guest View)",
  component: EventInvitation,
  parameters: { layout: "padded" },
  args: { event: sampleEvent, registry: sampleRegistry, calendar },
};
export default meta;
type Story = StoryObj<typeof EventInvitation>;

/** Someone on the plain event link: they add their name and email to RSVP. */
export const WithPicture: Story = {
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={null}
        token={null}
        openRsvp
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

/** No picture uploaded: a tinted header stands in. This guest already replied. */
export const NoPictureAlreadyReplied: Story = {
  args: { event: { ...sampleEvent, image_url: null, event_type: "birthday", title: "Max Turns 30", hosted_by: null } },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={{ name: "Glinda", status: "yes", partySize: 2, note: "Wouldn't miss it!" }}
        token="token-g1"
        openRsvp
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

/** A guest from their invitation link picks Going, so the party size shows. */
export const ChoosingGoing: Story = {
  args: { event: { ...sampleEvent, image_url: null }, registry: null, calendar: null },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={{ name: "Fiyero", status: "pending", partySize: 1, note: null }}
        token="token-g4"
        openRsvp
        maxPartySize={4}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    // A pattern, because labels hold a hidden "*" for required fields.
    await expect(canvas.getByLabelText(/How many people, including you/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Send RSVP" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This is a story");
  },
};

/** The host turned off open RSVPs, and this visitor has no personal link. */
export const InviteOnly: Story = {
  args: { event: { ...sampleEvent, image_url: null }, registry: null },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={null}
        token={null}
        openRsvp={false}
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

// The pictures are the landing page's drawings, so the story needs no network.
const [mainRegistry, bookRegistry] = sampleLinkedRegistries;
const linkedRegistries: InvitationRegistry[] = [
  {
    ...mainRegistry,
    itemsLeft: 23,
    items: [
      { id: "i1", title: "Glass Baby Bottles, 4 Pack", image_url: "/hero/bottle.svg", price: 34.99 },
      { id: "i2", title: "Organic Cotton Bibs", image_url: "/hero/bib.svg", price: 18 },
      { id: "i3", title: "Newborn Sock Set", image_url: "/hero/socks.svg", price: 12.5 },
      { id: "i4", title: "Panda Lovey", image_url: "/hero/panda.svg", price: 24 },
    ],
  },
  {
    ...bookRegistry,
    itemsLeft: 1,
    // No picture, so a gift icon stands in. And no price.
    items: [{ id: "i5", title: "Goodnight Moon (Board Book)", image_url: null, price: null }],
  },
];

/**
 * The shower links two registries and shows a few gifts each still needs.
 * The host added a gift note. This guest already replied.
 */
export const WithRegistriesAndGiftNote: Story = {
  args: {
    event: {
      ...sampleEvent,
      image_url: null,
      gift_note: "Gifts are optional. If you'd like to bring something, here's what Remi & Max still need.",
    },
    registry: null,
    registries: linkedRegistries,
    eventSlug: sampleEvent.slug,
    guestToken: "token-g1",
  },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={{ name: "Glinda", status: "yes", partySize: 2, note: null }}
        token="token-g1"
        openRsvp
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

/**
 * A holiday party with a gift exchange, before names are drawn. This guest
 * replied, said how many kids are coming and joined the exchange.
 */
export const WithGiftExchange: Story = {
  args: {
    event: sampleExchangeEvent,
    registry: null,
    exchange: sampleExchange,
    eventSlug: sampleExchangeEvent.slug,
    guestToken: "token-g1",
  },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleExchangeEvent.slug}
        guest={{
          name: "Glinda",
          status: "yes",
          partySize: 3,
          kidsCount: 2,
          note: "We'll bring dumplings!",
          inExchange: true,
          wishlistUrl: "https://regibee.com/r/glindas-wishlist-8h3m",
          giftIdeas: "Anything pink and sparkly",
        }}
        token="token-g1"
        openRsvp
        maxPartySize={sampleExchangeEvent.max_party_size}
        askKids
        exchange={{ mailed: false, drawn: false }}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

const potluckRows = signupRowsForGuest(samplePotluckSheet, "g1", SAMPLE_TODAY);

/**
 * A potluck with a sign-up sheet. Glinda signed up to bring a side. The sheet
 * shows what everyone's bringing, but not who.
 */
export const PotluckWithSignupSheet: Story = {
  args: {
    event: samplePotluckEvent,
    registry: null,
    signup: { title: samplePotluckSheet.sheet.title, note: samplePotluckSheet.sheet.note, rows: potluckRows },
  },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={samplePotluckEvent.slug}
        guest={{ name: "Glinda", status: "yes", partySize: 2, note: null }}
        token="token-g1"
        openRsvp
        maxPartySize={2}
        passed={false}
        signup={{ title: samplePotluckSheet.sheet.title, rows: potluckRows }}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

const mealTrainRows = signupRowsForGuest(sampleMealTrainSheet, "g4", SAMPLE_TODAY);

/**
 * A meal train, for a guest who hasn't signed up yet. The drop-off address
 * stays hidden until they pick a day.
 */
export const MealTrainBeforeSigningUp: Story = {
  args: {
    event: withAddressFor(sampleMealTrainEvent, false),
    registry: null,
    calendar: null,
    addressHidden: true,
    signup: {
      title: sampleMealTrainSheet.sheet.title,
      note: sampleMealTrainSheet.sheet.note,
      rows: mealTrainRows,
      mealTrain: true,
    },
  },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleMealTrainEvent.slug}
        guest={{ name: "Fiyero", status: "pending", partySize: 1, note: null }}
        token="token-g4"
        openRsvp
        maxPartySize={1}
        passed={false}
        mealTrain
        signup={{ title: sampleMealTrainSheet.sheet.title, rows: mealTrainRows }}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("The drop-off address shows here once you sign up for a day.")).toBeVisible();
    await expect(canvas.queryByText(/Sunnyside/)).toBeNull();
  },
};

/**
 * A family Christmas where everyone gives everyone. Glinda replied with her
 * wish list, so she sees everyone's lists above her RSVP.
 */
export const EveryoneGivesEveryone: Story = {
  args: {
    event: { ...sampleExchangeEvent, title: "Christmas at Aunt Linda's" },
    registry: null,
    exchange: sampleEveryoneExchange,
    eventSlug: sampleExchangeEvent.slug,
    guestToken: "token-g1",
  },
  render: (args) => (
    <EventInvitation {...args}>
      <GuestWishLists
        lists={sampleGuestWishLists}
        eventSlug={sampleExchangeEvent.slug}
        guestToken="token-g1"
        waitingCount={2}
      />
      <RsvpForm
        slug={sampleExchangeEvent.slug}
        guest={{
          name: "Glinda",
          status: "yes",
          partySize: 3,
          kidsCount: 2,
          note: "We'll bring dumplings!",
          inExchange: true,
          wishlistUrl: "https://regibee.com/r/glindas-wishlist-8h3m",
          giftIdeas: null,
        }}
        token="token-g1"
        openRsvp
        maxPartySize={sampleExchangeEvent.max_party_size}
        askKids
        exchange={{ kind: "everyone", mailed: false, drawn: false }}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

export const EveryoneGivesEveryonePhone: Story = {
  ...EveryoneGivesEveryone,
  globals: { viewport: { value: "mobile1" } },
};
