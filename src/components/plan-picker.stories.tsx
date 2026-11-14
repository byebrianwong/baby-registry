import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PlanPicker } from "./plan-picker";

const meta: Meta<typeof PlanPicker> = {
  title: "Components/PlanPicker",
  component: PlanPicker,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
  args: {
    myName: "Maya",
    startAction: fn(async () => ({ error: null, href: "/dashboard/events/event-1" })),
  },
};
export default meta;
type Story = StoryObj<typeof PlanPicker>;

/** The first question: every occasion, and a way to make just a wishlist. */
export const WhatAreYouPlanning: Story = {};

/** A baby shower: it's usually for someone else, so the name field asks for theirs. */
export const WhoItsFor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Baby shower" }));
    await expect(canvas.getByRole("heading", { name: "Who's the baby shower for?" })).toBeVisible();
    await userEvent.type(canvas.getByRole("textbox", { name: "Their name" }), "Remi");
  },
};

/** A Christmas party for no one in particular: link a wishlist, or draw names so everyone brings one. */
export const GiftsForAParty: Story = {
  args: {
    initial: { step: "gifts", occasion: "christmas", audience: "no_one" },
  },
};

/** Your own birthday, when you already have lists: pick one instead of pasting its link. */
export const UseAListYouHave: Story = {
  args: {
    myLists: [
      { id: "list-1", title: "Maya's Birthday Wishlist" },
      { id: "list-2", title: "Maya's Christmas List" },
    ],
    initial: { step: "gifts", occasion: "birthday", audience: "me", name: "Maya", gifts: "link", registryId: "list-1" },
  },
};

/** Someone else's shower: link their list, or ask them to make one. */
export const GiftsForSomeoneElse: Story = {
  args: {
    initial: { step: "gifts", occasion: "baby_shower", audience: "someone", name: "Remi", gifts: "ask", askEmail: "remi@example.com" },
  },
};

/** A child's birthday: make their wishlist and an invitation together. */
export const GiftsForMyChild: Story = {
  args: {
    initial: { step: "gifts", occasion: "kids_birthday", audience: "child", name: "Jordan", gifts: "new_list", invitation: true },
  },
};

/** The last step says everything it will make. */
export const NameIt: Story = {
  args: {
    initial: {
      step: "name",
      occasion: "kids_birthday",
      audience: "child",
      name: "Jordan",
      gifts: "new_list",
      invitation: true,
      title: "Jordan's Birthday Party",
      date: "2027-03-14",
    },
  },
};

/** A Secret Santa skips straight to its name: everyone draws names. */
export const SecretSanta: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Gift exchange" }));
    await expect(
      canvas.getByText("A Secret Santa draw. Guests add a wishlist when they join. Set the budget and draw date next."),
    ).toBeVisible();
  },
};
