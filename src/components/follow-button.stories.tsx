import type { Meta, StoryObj } from "@storybook/react";
import { FollowButton } from "./follow-button";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return { success: true };
};

const meta: Meta<typeof FollowButton> = {
  title: "Components/FollowButton",
  component: FollowButton,
  parameters: { layout: "centered" },
  args: {
    username: "jane-doe",
    requestAction: mockAction,
    cancelAction: mockAction,
  },
};
export default meta;
type Story = StoryObj<typeof FollowButton>;

export const NotFollowing: Story = { args: { state: "none" } };
export const Requested: Story = { args: { state: "pending" } };
export const Following: Story = { args: { state: "approved" } };
export const SignedOut: Story = { args: { state: "signed-out" } };
export const NeedsUsername: Story = { args: { state: "needs-profile" } };
