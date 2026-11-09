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
