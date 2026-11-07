import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
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
    parentName: "Remi & Max",
  },
  // The dialog starts closed. Open it so the snapshot shows what's inside.
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /contribute/i }));
    await screen.findByRole("dialog");
  },
};
export default meta;
type Story = StoryObj<typeof ContributeFundDialog>;

// Has a goal, so the dialog shows a progress bar and the amount remaining.
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
      venmo: "@remi-and-max",
      paypal: "max@example.com",
    },
  },
};

// No goal and no payment methods: no progress bar, and the dialog says to
// contact the registry owner instead of listing payment methods.
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
