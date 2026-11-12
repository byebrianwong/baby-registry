import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { RsvpForm } from "./rsvp-form";
import { sampleExchangeEvent } from "@/lib/event-sample-data";

// The RSVP box on its own, for the questions that only some events ask. The
// Event Invitation stories show it inside the whole page.

const meta: Meta<typeof RsvpForm> = {
  title: "Components/RsvpForm",
  component: RsvpForm,
  parameters: { layout: "padded" },
  args: {
    slug: sampleExchangeEvent.slug,
    // Fiyero, from his invitation link, before he answers.
    guest: { name: "Fiyero", status: "pending", partySize: 1, note: null },
    token: "token-g4",
    openRsvp: true,
    maxPartySize: 4,
    passed: false,
    submitAction: fn(async () => ({ error: null })),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof RsvpForm>;

/**
 * A party with a gift exchange. Choosing Going shows the exchange box, with
 * Join already checked and the wishlist and gift ideas fields open.
 */
export const PartyWithExchange: Story = {
  args: { exchange: { mailed: false, drawn: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    await expect(canvas.getByRole("checkbox", { name: /Join the gift exchange/ })).toBeChecked();
    await expect(canvas.getByLabelText(/Your wishlist/)).toBeVisible();
  },
};

/**
 * Everyone gives everyone, for a guest signed in with lists of their own.
 * Choosing Going shows a menu of their lists, with their newest picked.
 */
export const EveryoneGivesEveryone: Story = {
  args: {
    exchange: { kind: "everyone", mailed: false, drawn: false },
    myLists: [
      { title: "Fiyero's Christmas List", url: "https://regibee.com/r/fiyeros-list-5j2c" },
      { title: "Fiyero's Birthday Wishlist", url: "https://regibee.com/r/fiyero-birthday-9x1q" },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    await expect(canvas.getByLabelText("Your list")).toHaveValue("https://regibee.com/r/fiyeros-list-5j2c");
    await expect(canvas.queryByRole("checkbox", { name: /Join the gift exchange/ })).toBeNull();
  },
};

/** Everyone gives everyone, for a guest with no Regibee list: they paste a link, or make one. */
export const EveryoneGivesEveryoneNoList: Story = {
  args: { exchange: { kind: "everyone", mailed: false, drawn: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Maybe" }));
    await expect(canvas.getByLabelText(/Link to your wish list/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Make one on Regibee" })).toBeVisible();
  },
};

/**
 * An exchange with no get-together: gifts are mailed. Guests answer "I'm in"
 * or "Not this year", and joining asks for a shipping address.
 */
export const MailedExchange: Story = {
  args: { exchange: { mailed: true, drawn: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "I'm in" }));
    await expect(canvas.getByLabelText(/Shipping address/)).toBeVisible();
  },
};

/** The host asked how many kids are coming, so Going shows a second count. */
export const AskingKids: Story = {
  args: { askKids: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    await expect(canvas.getByLabelText(/How many are kids/)).toBeVisible();
  },
};
