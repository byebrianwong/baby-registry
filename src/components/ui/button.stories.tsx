import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";

import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// --- Variants ---

export const Default: Story = {
  args: {
    children: "Default",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
  },
};

// --- Sizes ---

export const SizeDefault: Story = {
  name: "Size: Default",
  args: {
    children: "Default Size",
    size: "default",
  },
};

export const SizeSmall: Story = {
  name: "Size: Small",
  args: {
    children: "Small",
    size: "sm",
  },
};

export const SizeLarge: Story = {
  name: "Size: Large",
  args: {
    children: "Large",
    size: "lg",
  },
};

export const SizeIcon: Story = {
  name: "Size: Icon",
  args: {
    size: "icon",
    children: <Plus className="h-4 w-4" />,
    "aria-label": "Add item",
  },
};

// --- With Icon ---

export const WithIcon: Story = {
  name: "With Icon",
  args: {
    children: (
      <span className="inline-flex items-center gap-1.5">
        <Plus className="h-4 w-4 shrink-0" />
        Add Item
      </span>
    ),
  },
};
