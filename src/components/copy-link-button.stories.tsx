import type { Meta, StoryObj } from "@storybook/react";
import { CopyLinkButton } from "./copy-link-button";

const meta: Meta<typeof CopyLinkButton> = {
  title: "Components/CopyLinkButton",
  component: CopyLinkButton,
  parameters: {
    layout: "centered",
  },
};
export default meta;
type Story = StoryObj<typeof CopyLinkButton>;

export const Default: Story = {
  args: {
    path: "/r/remi-and-maxs-baby-registry-abc123",
  },
};
