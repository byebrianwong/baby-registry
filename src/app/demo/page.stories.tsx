import type { Meta, StoryObj } from "@storybook/react";
import DemoPage from "./page";
import { DemoTodayProvider } from "./demo-today";

const meta: Meta<typeof DemoPage> = {
  title: "Pages/Public Registry (Gift Giver View)",
  component: DemoPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  // The demo's dates count from today. Fix the day so the snapshot doesn't
  // change every day.
  decorators: [
    (Story) => (
      <DemoTodayProvider today="2026-04-06">
        <Story />
      </DemoTodayProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof DemoPage>;

export const Default: Story = {};
