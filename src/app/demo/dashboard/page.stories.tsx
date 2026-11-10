import type { Meta, StoryObj } from "@storybook/react";
import DemoDashboardPage from "./page";
import { demoPageParameters, withDemoToday } from "../story-today";

const meta: Meta<typeof DemoDashboardPage> = {
  title: "Pages/Dashboard",
  component: DemoDashboardPage,
  parameters: demoPageParameters("/demo/dashboard"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoDashboardPage>;

// The My registries tab: the demo's guide, a follow request, and the baby
// registry and birthday wishlist.
export const Default: Story = {};
