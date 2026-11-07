import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
import { CoverItemDialog } from "./cover-item-dialog";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return undefined;
};

const meta: Meta<typeof CoverItemDialog> = {
  title: "Components/CoverItemDialog",
  component: CoverItemDialog,
  parameters: { layout: "centered" },
  args: {
    action: mockAction,
    parentName: "Remi & Max",
  },
};
export default meta;
type Story = StoryObj<typeof CoverItemDialog>;

// The dialog starts closed. Open it so the snapshot shows what's inside.
const openDialog: Story["play"] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /gift this/i }));
  await screen.findByRole("dialog");
};

// Lists all three payment methods.
export const SingleQuantity: Story = {
  args: {
    item: { id: "1", title: "UPPAbaby Vista V2 Stroller", price: 979.99, quantity_needed: 1 },
    paymentMethods: {
      venmo: "@remi-and-max",
      paypal: "max@example.com",
      zelle: "max@example.com",
    },
  },
  play: openDialog,
};

// Needs more than one, so the dialog adds a quantity field.
export const MultiQuantity: Story = {
  args: {
    item: { id: "4", title: "Muslin Swaddle Blankets", price: 12.99, quantity_needed: 5 },
    availableToGift: 3,
    paymentMethods: {
      venmo: "@remi-and-max",
    },
  },
  play: openDialog,
};
