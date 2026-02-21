import type { Meta, StoryObj } from "@storybook/react";
import { ReserveItemDialog } from "./reserve-item-dialog";

const meta: Meta<typeof ReserveItemDialog> = {
  title: "Components/ReserveItemDialog",
  component: ReserveItemDialog,
  parameters: {
    layout: "centered",
  },
};
export default meta;
type Story = StoryObj<typeof ReserveItemDialog>;

export const SingleQuantity: Story = {
  args: {
    item: {
      id: "1",
      title: "Hatch Rest+ Sound Machine",
      price: 69.99,
      quantity_needed: 1,
      quantity_fulfilled: 0,
    },
  },
};

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
};

export const Expensive: Story = {
  args: {
    item: {
      id: "3",
      title: "UPPAbaby Vista V2 Stroller",
      price: 979.99,
      quantity_needed: 1,
      quantity_fulfilled: 0,
    },
  },
};
