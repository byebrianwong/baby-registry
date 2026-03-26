import type { Meta, StoryObj } from "@storybook/react";
import { SuggestItemDialog } from "./suggest-item-dialog";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return undefined;
};

const meta: Meta<typeof SuggestItemDialog> = {
  title: "Components/SuggestItemDialog",
  component: SuggestItemDialog,
  parameters: { layout: "centered" },
  args: {
    action: mockAction,
  },
};
export default meta;
type Story = StoryObj<typeof SuggestItemDialog>;

export const Default: Story = {
  args: {
    registryId: "registry-1",
    categories: [
      { id: "cat-1", name: "Nursery" },
      { id: "cat-2", name: "Feeding" },
      { id: "cat-3", name: "Travel" },
      { id: "cat-4", name: "Clothing" },
    ],
  },
};

export const NoCategories: Story = {
  args: {
    registryId: "registry-1",
    categories: [],
  },
};
