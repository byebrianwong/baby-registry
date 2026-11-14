import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent } from "storybook/test";
import { FollowLists } from "./follow-lists";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 400));
  return { success: true };
};

const meta: Meta<typeof FollowLists> = {
  title: "Components/FollowLists",
  component: FollowLists,
  decorators: [(Story) => <div className="mx-auto max-w-2xl space-y-6 p-4"><Story /></div>],
  args: {
    approveAction: mockAction,
    removeAction: mockAction,
    cancelAction: mockAction,
    blockAction: mockAction,
    unblockAction: mockAction,
    followAction: mockAction,
  },
};
export default meta;
type Story = StoryObj<typeof FollowLists>;

export const WithEverything: Story = {
  args: {
    requests: [
      { public_id: "r4d8w2nb6h", full_name: "Grandma Dorothy", status: "pending" },
      { public_id: "s6g2t8vy3j", full_name: null, status: "pending" },
    ],
    // Alex follows back with one tap. Jordan and the account follow each
    // other, so Jordan shows as Mutual in both lists.
    followers: [
      { public_id: "a3f9c2xz7e", full_name: "Alex Kim", status: "approved" },
      { public_id: "h5n7b4ce9w", full_name: "Jordan Lee", status: "approved" },
    ],
    following: [
      { public_id: "h5n7b4ce9w", full_name: "Jordan Lee", status: "approved" },
      { public_id: "u2q6r8kd3m", full_name: "Tin Man", status: "pending" },
    ],
    blocked: [{ public_id: "e9w4z7pa2s", full_name: "Not A Real Aunt" }],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("Mutual", { exact: true })).toHaveLength(2);
  },
};


// Right after approving a request, on a phone: the request stays put with a
// Follow back button, and the new follower has one too.
export const AfterApproving: Story = {
  args: {
    requests: [{ public_id: "r4d8w2nb6h", full_name: "Grandma Dorothy", status: "pending" }],
    followers: [],
    following: [],
  },
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvas }) => {
    fireEvent.click(canvas.getByRole("button", { name: "Approve" }));
    const followBack = await canvas.findAllByRole("button", { name: "Follow back Grandma Dorothy" });
    await expect(followBack).toHaveLength(2);
  },
};
