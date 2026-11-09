import type { Meta, StoryObj } from "@storybook/react";
import { FollowingFeed } from "./following-feed";

const remiAndMax = { username: "remi-and-max", full_name: "Remi & Max" };
const mockSearch = async () => ({
  results: [{ username: "sam-lee", full_name: "Sam Lee", state: "none" as const }],
});
const alex = { username: "alex-kim", full_name: "Alex Kim" };

const meta: Meta<typeof FollowingFeed> = {
  title: "Components/FollowingFeed",
  component: FollowingFeed,
  args: {
    hasUsername: true,
    today: "2026-11-07",
    searchAction: mockSearch,
    people: [
      { ...remiAndMax, status: "approved" },
      { ...alex, status: "approved" },
      { username: "tin-man", full_name: "Tin Man", status: "pending" },
    ],
    registries: [
      { slug: "remi-max-baby", title: "Remi & Max's Baby Registry", event_date: "2027-02-10", registry_type: "baby", event_type: null, is_public: false, owner: remiAndMax },
      { slug: "alex-xmas", title: "Alex's Christmas List", event_date: "2026-12-25", registry_type: "personal", event_type: "christmas", is_public: true, owner: alex },
      { slug: "remi-wishlist", title: "Remi's Wishlist", event_date: null, registry_type: "personal", event_type: null, is_public: true, owner: remiAndMax },
      { slug: "alex-housewarming", title: "Our New Home", event_date: "2026-03-14", registry_type: "personal", event_type: "housewarming", is_public: true, owner: alex },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof FollowingFeed>;

// Search box, registries grouped by date, and the people you follow
// (one still waiting for approval).
export const WithRegistries: Story = {};

// No username yet: no search box, and an empty state that links to set one up.
export const NoUsername: Story = {
  args: { hasUsername: false, people: [], registries: [] },
};
