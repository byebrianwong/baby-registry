import type { Meta, StoryObj } from "@storybook/react";
import DemoEventsPage from "./page";
import { demoPageParameters, withDemoToday } from "../../story-today";

const meta: Meta<typeof DemoEventsPage> = {
  title: "Pages/Dashboard Events",
  component: DemoEventsPage,
  parameters: demoPageParameters("/demo/dashboard/events"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoEventsPage>;

// A co-hosted shower, a birthday dinner, a Secret Santa, Christmas dinner and a
// past housewarming. The meal train a friend hosts is under "Celebrating you".
export const Default: Story = {};
