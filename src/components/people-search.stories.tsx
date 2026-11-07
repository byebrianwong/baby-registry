import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent } from "storybook/test";
import { PeopleSearch } from "./people-search";

const people = [
  { username: "jane-doe", full_name: "Jane & John Doe", state: "none" as const },
  { username: "jane-smith", full_name: "Jane Smith", state: "pending" as const },
  { username: "janet-k", full_name: "Janet Kim", state: "approved" as const },
  { username: "jane-wong", full_name: "Jane Wong", state: "self" as const },
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

// Types "jan" so the snapshot shows results: one follow button per state, and
// "That's you" for your own profile. Type anything else for the empty state.
export const WithResults: Story = {
  play: async ({ canvas }) => {
    // fireEvent, not userEvent: userEvent.type fills in this input, but React
    // never sees the change, so the search doesn't run.
    fireEvent.change(canvas.getByRole("textbox", { name: /find people/i }), {
      target: { value: "jan" },
    });
    await canvas.findByText("That's you");
  },
};
