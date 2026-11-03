import type { Meta, StoryObj } from "@storybook/react";
import { LandingPage } from "./landing-page";

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
  },
};
export default meta;
type Story = StoryObj<typeof LandingPage>;

export const Default: Story = {};
