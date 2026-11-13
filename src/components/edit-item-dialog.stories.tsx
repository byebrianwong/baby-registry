import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EditItemDialog } from "./edit-item-dialog";

const CATEGORIES = [
  { id: "cat-1", name: "Nursery & Sleep" },
  { id: "cat-2", name: "Feeding" },
];

const meta: Meta<typeof EditItemDialog> = {
  title: "Components/EditItemDialog",
  component: EditItemDialog,
  parameters: {
    layout: "centered",
  },
  args: {
    registryId: "demo",
    categories: CATEGORIES,
    open: true,
    onOpenChange: fn(),
    linkedRegistries: [{ store: "amazon", url: "https://www.amazon.com/baby-reg/your-registry" }],
    item: {
      id: "item-1",
      title: "Philips Avent Natural Baby Bottles, 4 pack",
      external_url: "https://www.amazon.com/dp/B0EXAMPLE1?colid=EXAMPLECOLID&coliid=IEXAMPLEITEM",
      image_url: null,
      price: 32.99,
      quantity_needed: 2,
      quantity_fulfilled: 0,
      is_essential: false,
      is_parent_purchased: false,
      is_open_to_used: false,
      minimum_condition: null,
      notes: null,
      category_id: "cat-2",
    },
  },
};
export default meta;
type Story = StoryObj<typeof EditItemDialog>;

// Beside the link: fetch product details, and open the link in a new tab.
// Under it, the store link notice says the link counts toward the owner's
// Amazon registry.
export const RegistryLink: Story = {};

// No link yet, so there's nothing to open.
export const NoLink: Story = {
  args: {
    item: { ...meta.args!.item!, external_url: null },
  },
};

// On a phone the dialog is a sheet, and both buttons stay beside the link.
export const Phone: Story = {
  globals: { viewport: { value: "mobile1" } },
};
