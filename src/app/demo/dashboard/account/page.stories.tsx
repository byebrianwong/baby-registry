import type { Meta, StoryObj } from "@storybook/react";
import DemoAccountPage from "./page";
import { demoPageParameters, withDemoToday } from "../../story-today";

const meta: Meta<typeof DemoAccountPage> = {
  title: "Pages/Account",
  component: DemoAccountPage,
  parameters: demoPageParameters("/demo/dashboard/account"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoAccountPage>;

// Profile settings, two follow requests, followers, and the profile's registries.
export const Default: Story = {};
