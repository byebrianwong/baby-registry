import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent } from "storybook/test";
import { PeopleSearch } from "./people-search";

const people = [
  { username: "remi-wong", full_name: "Remi Wong", state: "none" as const },
  { username: "remi-smith", full_name: "Remi Smith", state: "pending" as const },
  { username: "remy-k", full_name: "Remy Kim", state: "approved" as const },
  { username: "remi-and-max", full_name: "Remi & Max", state: "self" as const },
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

// Types "rem" so the snapshot shows results: one follow button per state, and
// "That's you" for your own profile. Type anything else for the empty state.
export const WithResults: Story = {
  play: async ({ canvas }) => {
    // fireEvent, not userEvent: userEvent.type fills in this input, but React
    // never sees the change, so the search doesn't run.
    fireEvent.change(canvas.getByRole("textbox", { name: /find people/i }), {
      target: { value: "rem" },
    });
    await canvas.findByText("That's you");
  },
};
