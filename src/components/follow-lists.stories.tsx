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
      { username: "grandma-dorothy", full_name: "Grandma Dorothy", status: "pending" },
      { username: "sam-second", full_name: null, status: "pending" },
    ],
    followers: [{ username: "alex-friend", full_name: "Alex Kim", status: "approved" }],
    following: [
      { username: "jordan-lee", full_name: "Jordan Lee", status: "approved" },
      { username: "tin-man", full_name: "Tin Man", status: "pending" },
    ],
    blocked: [{ username: "spam-account", full_name: "Not A Real Aunt" }],
  },
};

