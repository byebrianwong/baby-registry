import type { Meta, StoryObj } from "@storybook/react";
import DemoDashboardPage from "./page";
import { withDemoToday } from "../story-today";

const meta: Meta<typeof DemoDashboardPage> = {
  title: "Pages/Dashboard",
  component: DemoDashboardPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoDashboardPage>;

export const Default: Story = {};
