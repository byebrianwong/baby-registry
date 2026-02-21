import type { Meta, StoryObj } from "@storybook/react";
import DemoPage from "./page";

const meta: Meta<typeof DemoPage> = {
  title: "Pages/Public Registry (Gift Giver View)",
  component: DemoPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};
export default meta;
type Story = StoryObj<typeof DemoPage>;

export const Default: Story = {};
