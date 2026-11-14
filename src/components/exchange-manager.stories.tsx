import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ExchangeManager } from "./exchange-manager";
import { exchangeStatus, guestForHost, type EventGuest } from "@/lib/events";
import {
  sampleEveryoneExchange,
  sampleDrawnExchange,
  sampleDrawnExchangeGuests,
  sampleExchange,
  sampleExchangeEvent,
  sampleExchangeExclusions,
  sampleExchangeGuests,
} from "@/lib/event-sample-data";

// The gift exchange panel on the host's event page. Like the page, each story
// works out the status from the full guest list, then gives the panel the
// guests as hosts see them, without who drew whom.

const ok = fn(async () => ({ error: null }));

const meta: Meta<typeof ExchangeManager> = {
  title: "Components/ExchangeManager",
  component: ExchangeManager,
  parameters: { layout: "padded" },
  args: {
    eventId: sampleExchangeEvent.id,
    editHref: "#",
    actions: {
      setParticipant: ok,
      addExclusion: ok,
      removeExclusion: ok,
      draw: fn(async () => ({ error: null, emailed: 4, withoutEmail: 1 })),
      undo: ok,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ExchangeManager>;

/** Five people are in, Elphaba and Fiyero won't draw each other, and names aren't drawn yet. */
export const BeforeTheDraw: Story = {
  args: {
    exchange: sampleExchange,
    status: exchangeStatus(sampleExchangeGuests, sampleExchange),
    guests: sampleExchangeGuests.map(guestForHost),
    exclusions: sampleExchangeExclusions,
  },
};

/** Names are drawn. Doctor Dillamond has no email, so the host texts him his link. */
export const AfterTheDraw: Story = {
  args: {
    exchange: sampleDrawnExchange,
    status: exchangeStatus(sampleDrawnExchangeGuests, sampleDrawnExchange),
    guests: sampleDrawnExchangeGuests.map(guestForHost),
    exclusions: sampleExchangeExclusions,
  },
};

// The host took Boq off the guest list after the draw. The database clears
// the name Doctor Dillamond drew (Boq), and nobody is giving to Elphaba now.
const boqRemoved: EventGuest[] = sampleDrawnExchangeGuests
  .filter((g) => g.id !== "g5")
  .map((g) => (g.giftee_id === "g5" ? { ...g, giftee_id: null } : g));

/** Someone left after the draw, so the panel asks the host to draw again. */
export const DrawIsOutOfDate: Story = {
  args: {
    exchange: sampleDrawnExchange,
    status: exchangeStatus(boqRemoved, sampleDrawnExchange),
    guests: boqRemoved.map(guestForHost),
    exclusions: sampleExchangeExclusions,
  },
};

/**
 * Everyone gives everyone: no draw. The panel shows who's taking part and
 * who has added a wish list. The host sees that a guest added one, not the
 * list itself.
 */
export const EveryoneGivesEveryone: Story = {
  args: {
    exchange: sampleEveryoneExchange,
    status: exchangeStatus(sampleExchangeGuests, sampleEveryoneExchange),
    guests: sampleExchangeGuests.map(guestForHost),
    exclusions: [],
  },
};

export const EveryoneGivesEveryonePhone: Story = {
  ...EveryoneGivesEveryone,
  globals: { viewport: { value: "mobile1" } },
};
