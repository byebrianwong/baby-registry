import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./nav-bar";

const account = {
  name: "Jane & John Doe",
  username: "jane-doe",
  email: "jane@example.com",
  followRequestCount: 0,
};

const meta: Meta<typeof NavBar> = {
  title: "Components/NavBar",
  component: NavBar,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/dashboard" } },
  },
  args: { account },
};
export default meta;
type Story = StoryObj<typeof NavBar>;

export const SignedIn: Story = {};

export const OnFollowingPage: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/dashboard/following" } } },
};

export const InsideARegistry: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/dashboard/registry/123/settings" } } },
};

export const WithFollowRequests: Story = {
  args: { account: { ...account, followRequestCount: 3 } },
};

export const NoUsernameYet: Story = {
  args: { account: { ...account, username: null } },
};

export const SignedOut: Story = {
  args: { account: null },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/" } } },
};

export const Phone: Story = {
  args: { account: { ...account, followRequestCount: 1 } },
  globals: { viewport: { value: "mobile1" } },
};
