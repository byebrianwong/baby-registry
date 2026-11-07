import type { Meta, StoryObj } from "@storybook/react";
import { PeopleSearch } from "./people-search";

const people = [
  { username: "jane-doe", full_name: "Jane & John Doe", state: "none" as const },
  { username: "jane-smith", full_name: "Jane Smith", state: "pending" as const },
  { username: "janet-k", full_name: "Janet Kim", state: "approved" as const },
];

const meta: Meta<typeof PeopleSearch> = {
  title: "Components/PeopleSearch",
  component: PeopleSearch,
  decorators: [(Story) => <div className="mx-auto max-w-xl p-4"><Story /></div>],
  args: {
    searchAction: async (query: string) => ({
      results: people.filter((p) =>
        `${p.username} ${p.full_name}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    }),
  },
};
export default meta;
type Story = StoryObj<typeof PeopleSearch>;

// Type "jan" to see results, or anything else for the empty state.
export const Default: Story = {};
