import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { FollowInviteCard } from "./follow-invite-card";

const meta: Meta<typeof FollowInviteCard> = {
  title: "Components/FollowInviteCard",
  component: FollowInviteCard,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  args: {
    inviter: { public_id: "r4d8w2nb6h", full_name: "Rose Doe" },
    token: "abc123",
    acceptAction: fn(async () => ({ success: true })),
    declineAction: fn(async () => ({ success: true })),
  },
};
export default meta;
type Story = StoryObj<typeof FollowInviteCard>;

// Signed in: say yes or no. Saying yes shows a link to choose registries.
export const Open: Story = {
  args: { view: "open" },
};

// Opened from the email before signing in.
export const SignedOut: Story = {
  args: { view: "signed-out" },
};

// The link has expired, or was answered already.
export const Expired: Story = {
  args: { view: "expired" },
};
