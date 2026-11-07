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

// After reserving: a link to buy the item and the address to ship it to.
export const ItemReservedWithAddress: Story = {
  args: {
    variant: "reserve",
    itemTitle: "Hatch Rest+ Sound Machine",
    shopUrl: "https://www.amazon.com/dp/B07WFXGNGB",
    shippingAddress: "123 Main St\nApt 4B\nSan Francisco, CA 94102",
  },
};

// After covering an item or contributing to a fund: where to send the money.
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
