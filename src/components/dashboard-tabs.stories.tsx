import type { Meta, StoryObj } from "@storybook/react";
import { DashboardTabs } from "./dashboard-tabs";
import { DashboardSkeleton, FollowingSkeleton } from "./page-skeletons";

// The tabs above each tab's loading skeleton, as they appear while a tab
// loads. The pages themselves load data on the server, which Storybook can't
// render.
const meta: Meta<typeof DashboardTabs> = {
  title: "Components/DashboardTabs",
  component: DashboardTabs,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/dashboard" } },
  },
  args: { showFollowing: true },
};
export default meta;
type Story = StoryObj<typeof DashboardTabs>;

export const MyRegistries: Story = {
  render: (args) => (
    <>
      <DashboardTabs {...args} />
      <DashboardSkeleton />
    </>
  ),
};

export const Following: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/dashboard/following" } } },
  render: (args) => (
    <>
      <DashboardTabs {...args} />
      <FollowingSkeleton />
    </>
  ),
};

/** Guests can't follow anyone, so they get only My registries. */
export const Guest: Story = {
  args: { showFollowing: false },
  render: MyRegistries.render,
};

/** On phones the two tabs split the width. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: MyRegistries.render,
};
