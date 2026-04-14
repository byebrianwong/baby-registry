import type { Meta, StoryObj } from "@storybook/react";
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
    parentName: "Denise & Brian",
  },
};
export default meta;
type Story = StoryObj<typeof CoverItemDialog>;

export const Default: Story = {
  args: {
    item: { id: "1", title: "UPPAbaby Vista V2 Stroller", price: 979.99, quantity_needed: 1 },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
    },
  },
};

export const WithAllPaymentMethods: Story = {
  args: {
    item: { id: "2", title: "Ergobaby Carrier", price: 189.0, quantity_needed: 1 },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
      zelle: "brian@example.com",
    },
  },
};

export const NoPaymentMethods: Story = {
  args: {
    item: { id: "3", title: "Baby Bouncer", price: 49.99, quantity_needed: 1 },
  },
};

export const MultiQuantity: Story = {
  args: {
    item: { id: "4", title: "Muslin Swaddle Blankets", price: 12.99, quantity_needed: 5 },
    availableToGift: 3,
    paymentMethods: {
      venmo: "@brian-wong",
    },
  },
};

export const SuccessState: Story = {
  args: {
    item: { id: "1", title: "UPPAbaby Vista V2 Stroller", price: 979.99, quantity_needed: 1 },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
    },
    alreadyPurchased: true,
  },
};
