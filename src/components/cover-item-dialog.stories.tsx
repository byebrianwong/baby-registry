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
    item: { id: "1", title: "UPPAbaby Vista V2 Stroller", price: 979.99 },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
    },
  },
};

export const WithAllPaymentMethods: Story = {
  args: {
    item: { id: "2", title: "Ergobaby Carrier", price: 189.0 },
    paymentMethods: {
      venmo: "@brian-wong",
      paypal: "brian@example.com",
      zelle: "brian@example.com",
    },
  },
};

export const NoPaymentMethods: Story = {
  args: {
    item: { id: "3", title: "Baby Bouncer", price: 49.99 },
  },
};

export const SuccessState: Story = {
  args: {
    item: { id: "1", title: "UPPAbaby Vista V2 Stroller", price: 979.99 },
    alreadyPurchased: true,
    shippingAddress: "123 Main St\nApt 4B\nSan Francisco, CA 94102",
  },
};
