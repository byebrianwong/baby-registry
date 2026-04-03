import type { Meta, StoryObj } from "@storybook/react";
import { ContributeFundDialog } from "./contribute-fund-dialog";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return undefined;
};

const meta: Meta<typeof ContributeFundDialog> = {
  title: "Components/ContributeFundDialog",
  component: ContributeFundDialog,
  parameters: { layout: "centered" },
  args: {
    action: mockAction,
    parentName: "Denise & Brian",
  },
};
export default meta;
type Story = StoryObj<typeof ContributeFundDialog>;

export const Default: Story = {
  args: {
    fund: {
      id: "1",
      title: "Nursery Furniture Fund",
      description: "Help us furnish the nursery!",
      goal_amount: 2000,
      current_amount: 450,
    },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
    },
  },
};

export const AlmostFunded: Story = {
  args: {
    fund: {
      id: "2",
      title: "College Savings Fund",
      description: "Starting early!",
      goal_amount: 1000,
      current_amount: 950,
    },
    paymentMethods: { venmo: "@brian-wong" },
  },
};

export const NoGoal: Story = {
  args: {
    fund: {
      id: "3",
      title: "Diaper Fund",
      description: "Every bit helps!",
      goal_amount: null,
      current_amount: 125,
    },
  },
};

export const SuccessState: Story = {
  args: {
    fund: {
      id: "1",
      title: "Nursery Furniture Fund",
      description: "Help us furnish the nursery!",
      goal_amount: 2000,
      current_amount: 450,
    },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
    },
    alreadyPurchased: true,
    previousAmount: 75,
  },
};
