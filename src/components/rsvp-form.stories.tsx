import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { RsvpForm } from "./rsvp-form";
import {
  SAMPLE_TODAY,
  sampleExchangeEvent,
  sampleMealTrainSheet,
  samplePotluckSheet,
} from "@/lib/event-sample-data";
import { signupRowsForGuest } from "@/lib/signups";
import { defaultQuestions } from "@/lib/rsvp-questions";

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
    await expect(canvas.getByLabelText(/^Your list/)).toHaveValue("https://regibee.com/r/fiyeros-list-5j2c");
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

/**
 * A potluck. Going shows "I'll bring…" with each row's spots left and what
 * others are bringing. Dessert is full. Ticking a row opens a box for what
 * you're bringing.
 */
export const BringingSomething: Story = {
  args: {
    signup: { title: samplePotluckSheet.sheet.title, rows: signupRowsForGuest(samplePotluckSheet, "g4", SAMPLE_TODAY) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    await expect(canvas.getByRole("checkbox", { name: /Dessert/ })).toBeDisabled();
    await userEvent.click(canvas.getByText("Side"));
    await expect(canvas.getByRole("checkbox", { name: /Side/ })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: "What you're bringing for Side" })).toBeVisible();
  },
};

/**
 * A meal train: no party, so guests answer "I can help" or "Not this time"
 * and pick a day. Monday is taken.
 */
export const MealTrain: Story = {
  args: {
    mealTrain: true,
    maxPartySize: 1,
    signup: { title: sampleMealTrainSheet.sheet.title, rows: signupRowsForGuest(sampleMealTrainSheet, "g4", SAMPLE_TODAY) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Hi Fiyero, can you help?" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "I can help" }));
    await expect(canvas.getByText("Pick a day")).toBeVisible();
    await expect(canvas.getByRole("checkbox", { name: /Mon, Mar 2/ })).toBeDisabled();
  },
};

/** A guest who signed up sees what they're bringing, and can change it. */
export const SignedUp: Story = {
  args: {
    guest: { name: "Glinda", status: "yes", partySize: 2, note: null },
    signup: { title: samplePotluckSheet.sheet.title, rows: signupRowsForGuest(samplePotluckSheet, "g1", SAMPLE_TODAY) },
  },
};

/**
 * A wedding's questions. Coming with someone asks their name, then a meal for
 * each of you. Dietary needs are optional.
 */
export const WeddingQuestions: Story = {
  args: { maxPartySize: 2, questions: defaultQuestions(["plus_ones", "meal", "diet"]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    await userEvent.selectOptions(canvas.getByLabelText(/How many people, including you/), "2");
    await userEvent.type(canvas.getByRole("textbox", { name: "Name of guest 2" }), "Elphaba");
    await expect(canvas.getByRole("combobox", { name: "For Elphaba" })).toBeVisible();
  },
};

/** A guest who answered sees their answers, with each person's meal. */
export const WeddingAnswered: Story = {
  args: {
    guest: {
      name: "Fiyero",
      status: "yes",
      partySize: 2,
      note: null,
      answers: { meal: ["Fish", "Vegetarian"], plus_ones: ["Elphaba"], diet: "Elphaba is allergic to water" },
    },
    questions: defaultQuestions(["plus_ones", "meal", "diet"]),
  },
};
