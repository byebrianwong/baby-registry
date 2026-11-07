import type { Meta, StoryObj } from "@storybook/react";
import { LandingPage } from "./landing-page";
import { NavBar } from "./nav-bar";

const meta: Meta<typeof LandingPage> = {
  title: "Pages/Landing Page",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  args: {
    ctaHref: "/signup",
    nav: <NavBar account={null} />,
  },
};
export default meta;
type Story = StoryObj<typeof LandingPage>;

export const Default: Story = {};
