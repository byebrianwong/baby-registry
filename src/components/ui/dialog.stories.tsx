import type { Meta, StoryObj } from "@storybook/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";
import { Input } from "@/components/base/input/input";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

// Opens on load, so the snapshot shows the dialog and not just the button.
export const Default: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Add Registry Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new item to your baby registry. Fill out the details below.
          </DialogDescription>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input label="Item Name" placeholder="e.g. Baby Monitor" />
          <Input label="Link (optional)" placeholder="https://example.com/item" />
          <Button type="submit">Add Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
