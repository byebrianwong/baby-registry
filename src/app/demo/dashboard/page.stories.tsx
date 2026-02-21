import type { Meta, StoryObj } from "@storybook/react";
import DemoDashboardPage from "./page";

const meta: Meta<typeof DemoDashboardPage> = {
  title: "Pages/Dashboard",
  component: DemoDashboardPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};
export default meta;
type Story = StoryObj<typeof DemoDashboardPage>;

export const Default: Story = {};
