import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { SignupSheetManager, SignupSheetStarter } from "./signup-sheet-manager";
import { sampleGuests, sampleMealTrainSheet, samplePotluckSheet } from "@/lib/event-sample-data";
import { signupRowsForHost } from "@/lib/signups";

// The host's side of a sign-up sheet, on the event's dashboard page.

const ok = fn(async () => ({ error: null }));

const meta: Meta<typeof SignupSheetManager> = {
  title: "Components/SignupSheetManager",
  component: SignupSheetManager,
  parameters: { layout: "padded" },
  args: {
    eventId: samplePotluckSheet.sheet.event_id,
    sheet: samplePotluckSheet.sheet,
    rows: signupRowsForHost(samplePotluckSheet, sampleGuests),
    actions: {
      start: ok,
      updateSheet: ok,
      deleteSheet: ok,
      addRows: fn(async () => ({ error: null, added: 1 })),
      updateRow: ok,
      removeRow: ok,
      removeClaim: ok,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SignupSheetManager>;

/** A potluck: who's bringing what, and how many spots each row has left. */
export const Potluck: Story = {};

/** Edit shows the sheet's name and note, and the button that removes it. */
export const EditingTheSheet: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
    await expect(canvas.getByRole("textbox", { name: /Name/ })).toHaveValue("Bring a dish");
    await expect(canvas.getByRole("button", { name: "Remove sheet" })).toBeVisible();
  },
};

/** "Add a row" opens a small form: what, how many, and an optional day. */
export const AddingARow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add a row" }));
    await expect(canvas.getByRole("textbox", { name: /What/ })).toBeVisible();
  },
};

/** A meal train: each row is a day, and the address shows only to people who sign up. */
export const MealTrain: Story = {
  args: {
    sheet: sampleMealTrainSheet.sheet,
    rows: signupRowsForHost(sampleMealTrainSheet, sampleGuests),
    mealTrain: true,
  },
};

/** A new meal train with no days yet starts with the form that adds a row for each day. */
export const MealTrainWithNoDays: Story = {
  args: {
    sheet: sampleMealTrainSheet.sheet,
    rows: [],
    mealTrain: true,
  },
};

/** An event with no sheet: the sidebar card that starts one from a preset. */
export const Starter: StoryObj<typeof SignupSheetStarter> = {
  render: () => <SignupSheetStarter eventId="event-1" actions={{ start: ok }} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add a sign-up sheet" }));
    await expect(canvas.getByRole("button", { name: /Potluck/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Meal train/ })).toBeVisible();
  },
};
