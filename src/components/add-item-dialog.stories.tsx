import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
import { AddItemDialog } from "./add-item-dialog";

const DEMO_CATEGORIES = [
  { id: "cat-1", name: "Nursery & Sleep" },
  { id: "cat-2", name: "Feeding" },
  { id: "cat-3", name: "Diapering" },
  { id: "cat-4", name: "Gear & Travel" },
  { id: "cat-5", name: "Bath" },
  { id: "cat-6", name: "Clothing" },
  { id: "cat-7", name: "Health & Safety" },
  { id: "cat-8", name: "Toys & Books" },
  { id: "cat-9", name: "Maternity & Postpartum" },
  { id: "cat-10", name: "Gifts & Extras" },
];

const meta: Meta<typeof AddItemDialog> = {
  title: "Components/AddItemDialog",
  component: AddItemDialog,
  parameters: {
    layout: "centered",
  },
};
export default meta;
type Story = StoryObj<typeof AddItemDialog>;

// The dialog starts closed. Open it so the snapshot shows the form.
export const Default: Story = {
  args: {
    registryId: "demo",
    categories: DEMO_CATEGORIES,
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /add item/i }));
    await screen.findByRole("dialog");
  },
};

// On a phone the dialog is a sheet from the bottom edge. The link field takes
// the full width with Paste link and Fetch under it, and Cancel and Add item
// stay in a bar at the bottom while the form scrolls.
export const Phone: Story = {
  ...Default,
  globals: { viewport: { value: "mobile1" } },
};
