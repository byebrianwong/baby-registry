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

// After contributing to a fund: where to send the money.
export const ContributionWithPayment: Story = {
  args: {
    variant: "contribute",
    itemTitle: "Nursery Furniture Fund",
    amount: 50,
    paymentMethods: {
      venmo: "@remi-and-max",
      paypal: "max@example.com",
    },
  },
};
