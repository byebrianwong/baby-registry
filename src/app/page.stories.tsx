import type { Meta, StoryObj } from "@storybook/react";
import HomePage from "./page";

const meta: Meta<typeof HomePage> = {
  title: "Pages/Landing Page",
  component: HomePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
};
export default meta;
type Story = StoryObj<typeof HomePage>;

export const Default: Story = {};
