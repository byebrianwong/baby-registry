import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
import { ReserveItemDialog } from "./reserve-item-dialog";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return undefined;
};

const meta: Meta<typeof ReserveItemDialog> = {
  title: "Components/ReserveItemDialog",
  component: ReserveItemDialog,
  parameters: { layout: "centered" },
  args: {
    action: mockAction,
    parentName: "Remi & Max",
  },
};
export default meta;
type Story = StoryObj<typeof ReserveItemDialog>;

// The dialog starts closed. Open it so the snapshot shows what's inside.
const openDialog: Story["play"] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /gift this/i }));
  await screen.findByRole("dialog");
};

// Has a store link, so the dialog shows a "Purchase from" button.
export const SingleQuantity: Story = {
  args: {
    item: {
      id: "1",
      title: "Hatch Rest+ Sound Machine",
      price: 69.99,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      external_url: "https://www.amazon.com/dp/B07WFXGNGB",
    },
  },
  play: openDialog,
};

// The owner linked their Amazon registry, so the dialog explains how to buy
// there so the gift counts toward it.
export const OnStoreRegistry: Story = {
  args: {
    item: {
      id: "3",
      title: "Solly Baby Wrap",
      price: 74,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      external_url: "https://www.amazon.com/dp/B0EXAMPLE?colid=EXAMPLE&coliid=EXAMPLE&psc=1",
    },
    registryStoreName: "Amazon",
  },
  play: openDialog,
};

// Needs more than one, so the dialog adds a quantity field. No store link.
export const MultiQuantity: Story = {
  args: {
    item: {
      id: "2",
      title: "Fitted Crib Sheets (Organic Cotton)",
      price: 24.99,
      quantity_needed: 4,
      quantity_fulfilled: 1,
    },
  },
  play: openDialog,
};

// What the giver sees after reserving: the button turns into "Reserved".
export const SuccessState: Story = {
  args: {
    item: {
      id: "1",
      title: "Hatch Rest+ Sound Machine",
      price: 69.99,
      quantity_needed: 1,
      quantity_fulfilled: 0,
    },
    alreadyPurchased: true,
    shippingAddress: "123 Main St\nApt 4B\nSan Francisco, CA 94102",
  },
};
