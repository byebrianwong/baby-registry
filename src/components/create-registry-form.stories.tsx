import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { CreateRegistryForm } from "./create-registry-form";

// Sections open and close with a 200ms transition. Wait for it to end so the
// snapshot shows the finished layout.
const settle = () => new Promise((resolve) => setTimeout(resolve, 400));

// Sets a text field's value. userEvent.type doesn't work on these fields: the
// form focuses them in code when a section opens, and after that React never
// sees the characters userEvent types (checked 2026-11-07). Real typing works.
// fireEvent.input sets the value the way React expects.
const fill = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } });

const region = (canvasElement: HTMLElement, name: RegExp) =>
  within(canvasElement).getByRole("region", { name });

const isOpen = (canvasElement: HTMLElement, name: RegExp) =>
  expect(within(canvasElement).getByRole("button", { name, expanded: true })).toBeInTheDocument();

const meta: Meta<typeof CreateRegistryForm> = {
  title: "Components/CreateRegistryForm",
  component: CreateRegistryForm,
  parameters: { layout: "fullscreen" },
  args: {
    username: "remi-and-max",
    createAction: fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { error: "This is a story, so nothing was saved." };
    }),
  },
};
export default meta;
type Story = StoryObj<typeof CreateRegistryForm>;

export const FirstStep: Story = {};

// Without a profile, the privacy section offers to set one up instead of the
// "Show on my profile" checkbox.
export const NoProfileYet: Story = {
  args: { username: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Who can see it/ }));
    await expect(canvas.getByRole("link", { name: "Set up your public profile" })).toBeVisible();
    await settle();
  },
};

// Choosing Personal shows the occasions. Picking one moves on to the name.
export const PersonalOccasions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^Personal/ }));
    await expect(canvas.getByRole("button", { name: "Birthday" })).toBeVisible();
    await settle();
  },
};

// Clicking Baby closes the first section and puts the cursor in the name field.
export const NameStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^Baby/ }));
    await waitFor(() => expect(canvas.getByLabelText(/Registry name/)).toHaveFocus());
    await isOpen(canvasElement, /Name and date/);
    await settle();
  },
};

// Pressing Create with no name opens the name section and shows the error.
export const MissingName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create Registry" }));
    await waitFor(() => expect(canvas.getByLabelText(/Registry name/)).toHaveFocus());
    await expect(canvas.getByText("Add a name to continue.")).toBeVisible();
    await settle();
  },
};

// The whole flow: pick a type, name it, keep the privacy defaults, skip the
// welcome message, add a Venmo handle, then type a zip code, which finishes
// the last section by itself. Every section ends up closed with a summary.
export const AllStepsDone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: /^Baby/ }));
    const title = canvas.getByLabelText(/Registry name/);
    await waitFor(() => expect(title).toHaveFocus());
    fill(title, "Remi & Max's Baby Registry");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => isOpen(canvasElement, /Who can see it/));
    await userEvent.click(
      within(region(canvasElement, /Who can see it/)).getByRole("button", { name: "Continue" }),
    );

    await waitFor(() => isOpen(canvasElement, /Welcome message/));
    await userEvent.click(
      within(region(canvasElement, /Welcome message/)).getByRole("button", { name: "Skip" }),
    );

    await waitFor(() => isOpen(canvasElement, /Payments and sales tax/));
    fill(canvas.getByLabelText(/Venmo/), "@remi-and-max");
    fill(canvas.getByLabelText(/Zip code/), "94110");

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Create Registry" })).toHaveFocus(),
    );
    await settle();
  },
};
