import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent, fn } from "storybook/test";
import { PeopleSearch } from "./people-search";

const people = [
  { public_id: "k7m2p9qx4t", full_name: "Remi Wong", state: "none" as const },
  { public_id: "r4d8w2nb6h", full_name: "Remi Smith", state: "pending" as const },
  { public_id: "a3f9c2xz7e", full_name: "Remy Kim", state: "approved" as const },
  { public_id: "h5n7b4ce9w", full_name: "Remi & Max", state: "self" as const },
];

const meta: Meta<typeof PeopleSearch> = {
  title: "Components/PeopleSearch",
  component: PeopleSearch,
  decorators: [(Story) => <div className="mx-auto max-w-xl p-4"><Story /></div>],
  args: {
    // Names match anywhere in the name. No email address matches, so email
    // lookups always offer an invite.
    searchAction: async (query: string) =>
      query.includes("@")
        ? { kind: "email" as const, results: [] }
        : {
            kind: "name" as const,
            results: people.filter((p) => p.full_name.toLowerCase().includes(query.trim().toLowerCase())),
          },
    inviteAction: fn(async () => ({ success: true })),
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

// An email address that finds nobody offers to send an invite.
export const EmailNotFound: Story = {
  play: async ({ canvas }) => {
    fireEvent.change(canvas.getByRole("textbox", { name: /find people/i }), {
      target: { value: "grandma@example.com" },
    });
    fireEvent.click(await canvas.findByRole("button", { name: "Look up" }));
    await canvas.findByRole("button", { name: "Send invite" });
  },
};
