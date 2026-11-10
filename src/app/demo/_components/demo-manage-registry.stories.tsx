import type { Meta, StoryObj } from "@storybook/react";
import { DemoManageRegistry } from "./demo-manage-registry";
import { demoPageParameters, withDemoToday } from "../story-today";

const meta: Meta<typeof DemoManageRegistry> = {
  title: "Pages/Registry Management",
  component: DemoManageRegistry,
  parameters: demoPageParameters("/demo/dashboard/registry/baby"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoManageRegistry>;

// The baby registry: store links, gift funds, a linked shower and store perks.
export const Default: Story = { args: { registryId: "baby" } };

// A personal registry: Max's birthday wishlist, linked to his birthday dinner.
export const BirthdayWishlist: Story = { args: { registryId: "wishlist" } };
