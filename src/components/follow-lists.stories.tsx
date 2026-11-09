import type { Meta, StoryObj } from "@storybook/react";
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
  },
};
export default meta;
type Story = StoryObj<typeof FollowLists>;

export const WithEverything: Story = {
  args: {
    requests: [
      { public_id: "r4d8w2nb6h", full_name: "Rose Doe", status: "pending" },
      { public_id: "s6g2t8vy3j", full_name: null, status: "pending" },
    ],
    followers: [{ public_id: "a3f9c2xz7e", full_name: "Alex Kim", status: "approved" }],
    following: [
      { public_id: "h5n7b4ce9w", full_name: "Jordan Lee", status: "approved" },
      { public_id: "u2q6r8kd3m", full_name: "Priya Raman", status: "pending" },
    ],
    blocked: [{ public_id: "e9w4z7pa2s", full_name: "Not A Real Aunt" }],
  },
};

