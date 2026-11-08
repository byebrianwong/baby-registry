import type { Meta, StoryObj } from "@storybook/react";

import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

// One story is enough: other values only move the fill. Drag the control to try them.
export const Default: Story = {
  args: {
    value: 60,
    // Progress requires a label (aria-label or aria-labelledby).
    "aria-label": "Gifts fulfilled",
  },
};
