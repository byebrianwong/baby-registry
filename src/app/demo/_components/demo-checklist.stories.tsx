import type { Meta, StoryObj } from "@storybook/react";
import { DemoChecklist as DemoChecklistPage } from "./demo-checklist";
import { demoPageParameters } from "../story-today";

const meta: Meta<typeof DemoChecklistPage> = {
  title: "Pages/Checklist",
  component: DemoChecklistPage,
  parameters: demoPageParameters("/demo/dashboard/registry/baby/checklist"),
};
export default meta;
type Story = StoryObj<typeof DemoChecklistPage>;

export const Default: Story = {};
