import type { Meta, StoryObj } from "@storybook/react";
import { CelebrationDialog } from "./celebration-dialog";

const meta: Meta<typeof CelebrationDialog> = {
  title: "Components/CelebrationDialog",
  component: CelebrationDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    onClose: () => {},
    parentName: "Remi & Max",
  },
};
export default meta;
type Story = StoryObj<typeof CelebrationDialog>;

export const ItemReserved: Story = {
  args: {
    variant: "reserve",
    itemTitle: "Hatch Rest+ Sound Machine",
  },
};

export const ItemReservedWithAddress: Story = {
  args: {
    variant: "reserve",
    itemTitle: "Hatch Rest+ Sound Machine",
    shippingAddress: "123 Main St\nApt 4B\nSan Francisco, CA 94102",
  },
};

export const ItemCoveredWithPayment: Story = {
  args: {
    variant: "cover",
    itemTitle: "UPPAbaby Vista V2 Stroller",
    paymentMethods: {
      venmo: "@remi-and-max",
      paypal: "max@example.com",
    },
  },
};

export const CashFundWithPayment: Story = {
  args: {
    variant: "contribute",
    itemTitle: "Nursery Furniture Fund",
    amount: 50,
    paymentMethods: {
      venmo: "@remi-and-max",
      zelle: "max@example.com",
    },
  },
};
