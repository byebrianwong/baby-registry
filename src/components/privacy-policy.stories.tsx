import type { Meta, StoryObj } from "@storybook/react";
import { NavBar } from "./nav-bar";
import { PrivacyPolicy } from "./privacy-policy";

const meta: Meta<typeof PrivacyPolicy> = {
  title: "Pages/Privacy Policy",
  component: PrivacyPolicy,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  args: {
    nav: <NavBar account={null} />,
  },
};
export default meta;
type Story = StoryObj<typeof PrivacyPolicy>;

export const Default: Story = {};
