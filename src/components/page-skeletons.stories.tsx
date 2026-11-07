import type { Meta, StoryObj } from "@storybook/react";
import { AccountSkeleton, DashboardSkeleton, FollowingSkeleton } from "./page-skeletons";

const meta: Meta = {
  title: "Components/PageSkeletons",
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;
type Story = StoryObj;

export const Dashboard: Story = {
  render: () => <DashboardSkeleton />,
};

export const Following: Story = {
  render: () => <FollowingSkeleton />,
};

export const Account: Story = {
  render: () => <AccountSkeleton />,
};
