import type { Meta, StoryObj } from "@storybook/react";
import { DemoRegistrySettings } from "./demo-registry-settings";
import { demoPageParameters, withDemoToday } from "../story-today";

const meta: Meta<typeof DemoRegistrySettings> = {
  title: "Pages/Registry Settings",
  component: DemoRegistrySettings,
  parameters: demoPageParameters("/demo/dashboard/registry/baby/settings"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoRegistrySettings>;

// Every section, with store registries and a co-manager.
export const Default: Story = { args: { registryId: "baby" } };
