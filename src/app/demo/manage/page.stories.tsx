import type { Meta, StoryObj } from "@storybook/react";
import DemoManagePage from "./page";
import { withDemoToday } from "../story-today";

const meta: Meta<typeof DemoManagePage> = {
  title: "Pages/Registry Management",
  component: DemoManagePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoManagePage>;

export const Default: Story = {};
