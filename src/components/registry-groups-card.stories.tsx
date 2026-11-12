import type { Meta, StoryObj } from "@storybook/react";
import { RegistryGroupsCard } from "./registry-groups-card";

const groups = [
  { id: "group-1", name: "Book club", memberCount: 8 },
  { id: "group-2", name: "The Chens", memberCount: 6 },
];

const meta: Meta<typeof RegistryGroupsCard> = {
  title: "Components/RegistryGroupsCard",
  component: RegistryGroupsCard,
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4"><Story /></div>],
  args: {
    registryId: "reg-1",
    saveAction: async () => ({ error: null }),
  },
};
export default meta;
type Story = StoryObj<typeof RegistryGroupsCard>;

/** Shared with the family, not the book club. */
export const WithGroups: Story = {
  args: { loadAction: async () => ({ error: null, groups, sharedWith: ["group-2"] }) },
};

/** No groups yet: it says where to make one. */
export const NoGroups: Story = {
  args: { loadAction: async () => ({ error: null, groups: [], sharedWith: [] }) },
};
