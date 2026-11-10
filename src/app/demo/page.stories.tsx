import type { Meta, StoryObj } from "@storybook/react";
import { DemoPublicRegistry } from "./_components/demo-public-registry";
import { demoPageParameters, withDemoToday } from "./story-today";

const meta: Meta<typeof DemoPublicRegistry> = {
  title: "Pages/Public Registry (Gift Giver View)",
  component: DemoPublicRegistry,
  parameters: demoPageParameters("/demo"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoPublicRegistry>;

// Remi & Max's baby registry, which /demo shows.
export const Default: Story = { args: { slug: "remi-and-max" } };

// A personal registry: Max's birthday wishlist.
export const BirthdayWishlist: Story = { args: { slug: "max-turns-30" } };
