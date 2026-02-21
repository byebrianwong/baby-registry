import type { Meta, StoryObj } from "@storybook/react";
import DemoManagePage from "./page";

const meta: Meta<typeof DemoManagePage> = {
  title: "Pages/Registry Management",
  component: DemoManagePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};
export default meta;
type Story = StoryObj<typeof DemoManagePage>;

export const Default: Story = {};
