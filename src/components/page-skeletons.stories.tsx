import type { Meta, StoryObj } from "@storybook/react";
import { AccountSkeleton } from "./page-skeletons";

// The dashboard and Following skeletons show under the dashboard tabs, so
// their stories are in dashboard-tabs.stories.tsx.
const meta: Meta = {
  title: "Components/PageSkeletons",
  parameters: {
    layout: "fullscreen",
  },
};
export default meta;
type Story = StoryObj;

export const Account: Story = {
  render: () => <AccountSkeleton />,
};
