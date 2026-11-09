import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./nav-bar";

const account = {
  name: "Jane & John Doe",
  profilePath: "/u/jane-john-doe-k7m2p9qx4t",
  email: "jane@example.com",
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

export const SignedOut: Story = {
  args: { account: null },
};

export const Phone: Story = {
  args: { account: { ...account, followRequestCount: 1 } },
  globals: { viewport: { value: "mobile1" } },
};
