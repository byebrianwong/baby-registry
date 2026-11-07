import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
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

// The dialog starts closed. Open it so the snapshot shows the form.
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
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /suggest an item/i }));
    await screen.findByRole("dialog");
  },
};
