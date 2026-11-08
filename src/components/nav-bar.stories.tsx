import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./nav-bar";

const account = {
  name: "Remi & Max",
  username: "remi-and-max",
  email: "remi@example.com",
  followRequestCount: 0,
};

const meta: Meta<typeof NavBar> = {
  title: "Components/NavBar",
  component: NavBar,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: { account },
};
export default meta;
type Story = StoryObj<typeof NavBar>;

export const SignedIn: Story = {};

export const WithFollowRequests: Story = {
  args: { account: { ...account, followRequestCount: 3 } },
};

export const NoUsernameYet: Story = {
  args: { account: { ...account, username: null } },
};

export const SignedOut: Story = {
  args: { account: null },
};

export const Phone: Story = {
  args: { account: { ...account, followRequestCount: 1 } },
  globals: { viewport: { value: "mobile1" } },
};
