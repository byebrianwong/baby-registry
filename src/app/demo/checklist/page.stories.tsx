import type { Meta, StoryObj } from "@storybook/react";
import DemoChecklistPage from "./page";

const meta: Meta<typeof DemoChecklistPage> = {
  title: "Pages/Checklist",
  component: DemoChecklistPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};
export default meta;
type Story = StoryObj<typeof DemoChecklistPage>;

export const Default: Story = {};
