import type { Meta, StoryObj } from "@storybook/react";
import DemoFollowingPage from "./page";
import { demoPageParameters, withDemoToday } from "../../story-today";

const meta: Meta<typeof DemoFollowingPage> = {
  title: "Pages/Dashboard Following",
  component: DemoFollowingPage,
  parameters: demoPageParameters("/demo/dashboard/following"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoFollowingPage>;

// Registries from people Remi & Max follow, and one request still waiting.
export const Default: Story = {};
