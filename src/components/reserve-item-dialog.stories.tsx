import type { Meta, StoryObj } from "@storybook/react";
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
    parentName: "Denise & Brian",
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
      external_url: "https://www.amazon.com/dp/B07WFXGNGB",
    },
  },
};

export const WithoutUrl: Story = {
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
      external_url: "https://www.target.com/p/fitted-crib-sheets",
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
      external_url: "https://uppababy.com/vista/",
    },
  },
};

export const NoParentName: Story = {
  name: "No Parent Name (fallback)",
  args: {
    parentName: undefined,
    item: {
      id: "1",
      title: "Hatch Rest+ Sound Machine",
      price: 69.99,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      external_url: "https://www.amazon.com/dp/B07WFXGNGB",
    },
  },
};

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
