import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { GroupsSection } from "./groups-section";

const meta: Meta<typeof GroupsSection> = {
  title: "Components/GroupsSection",
  component: GroupsSection,
  parameters: { layout: "padded" },
  args: { createAction: fn(async () => ({ error: null, id: "group-new" })) },
};
export default meta;
type Story = StoryObj<typeof GroupsSection>;

export const WithGroups: Story = {
  args: {
    groups: [
      { id: "group-1", name: "Book club", memberCount: 8 },
      { id: "group-2", name: "Max's class", memberCount: 22 },
      { id: "group-3", name: "The Chens", memberCount: 1 },
    ],
  },
};

/** Before the first group. */
export const NoGroups: Story = { args: { groups: [] } };
