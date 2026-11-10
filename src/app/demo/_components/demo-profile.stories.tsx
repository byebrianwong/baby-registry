import type { Meta, StoryObj } from "@storybook/react";
import { DemoProfile } from "./demo-profile";
import { demoPageParameters, withDemoToday } from "../story-today";

const meta: Meta<typeof DemoProfile> = {
  title: "Pages/Profile",
  component: DemoProfile,
  parameters: demoPageParameters("/demo/u/glinda-upland-g4n8r2wd6h"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoProfile>;

// Someone Remi & Max follow, so her followers-only registry shows.
export const Followed: Story = { args: { segment: "glinda-upland-g4n8r2wd6h" } };
