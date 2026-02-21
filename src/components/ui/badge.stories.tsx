import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// --- Variants ---

export const Default: Story = {
  args: {
    children: "Essential",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Fulfilled",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Reserved",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Optional",
    variant: "outline",
  },
};
