import type { Meta, StoryObj } from "@storybook/react";
import { AddItemDialog } from "./add-item-dialog";

const DEMO_CATEGORIES = [
  { id: "cat-1", name: "Nursery & Sleep" },
  { id: "cat-2", name: "Feeding" },
  { id: "cat-3", name: "Diapering" },
  { id: "cat-4", name: "Gear & Travel" },
  { id: "cat-5", name: "Bath" },
  { id: "cat-6", name: "Clothing" },
  { id: "cat-7", name: "Health & Safety" },
  { id: "cat-8", name: "Toys & Books" },
  { id: "cat-9", name: "Maternity & Postpartum" },
  { id: "cat-10", name: "Gifts & Extras" },
];

const meta: Meta<typeof AddItemDialog> = {
  title: "Components/AddItemDialog",
  component: AddItemDialog,
  parameters: {
    layout: "centered",
  },
};
export default meta;
type Story = StoryObj<typeof AddItemDialog>;

export const Default: Story = {
  args: {
    registryId: "demo",
    categories: DEMO_CATEGORIES,
  },
};

export const WithDefaults: Story = {
  name: "Pre-filled from Checklist",
  args: {
    registryId: "demo",
    categories: DEMO_CATEGORIES,
    defaultValues: {
      title: "Convertible Crib",
      price: "350",
      categoryId: "cat-1",
      quantityNeeded: "1",
      isEssential: true,
    },
  },
};
