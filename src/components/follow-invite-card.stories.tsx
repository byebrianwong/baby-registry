import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent, fn } from "storybook/test";
import { FollowInviteCard } from "./follow-invite-card";

const meta: Meta<typeof FollowInviteCard> = {
  title: "Components/FollowInviteCard",
  component: FollowInviteCard,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  args: {
    inviter: { public_id: "r4d8w2nb6h", full_name: "Grandma Dorothy" },
    token: "abc123",
    acceptAction: fn(async () => ({ success: true })),
    declineAction: fn(async () => ({ success: true })),
    followAction: fn(async () => ({ success: true })),
  },
};
export default meta;
type Story = StoryObj<typeof FollowInviteCard>;

// Signed in: say yes or no. Saying yes shows a link to choose registries.
export const Open: Story = {
  args: { view: "open" },
};

// After saying yes: one tap follows Dorothy back.
export const Accepted: Story = {
  args: { view: "open" },
  play: async ({ canvas }) => {
    fireEvent.click(canvas.getByRole("button", { name: /follow me/i }));
    await canvas.findByRole("button", { name: "Follow back Grandma Dorothy" });
  },
};

// Opened from the email before signing in.
export const SignedOut: Story = {
  args: { view: "signed-out" },
};

// The link has expired, or was answered already.
export const Expired: Story = {
  args: { view: "expired" },
};
