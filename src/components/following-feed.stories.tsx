import type { Meta, StoryObj } from "@storybook/react";
import { FollowingFeed } from "./following-feed";

const remiAndMax = { public_id: "k7m2p9qx4t", full_name: "Remi & Max" };
const mockSearch = async () => ({
  kind: "name" as const,
  results: [{ public_id: "b8c3j6tf5y", full_name: "Sam Lee", state: "none" as const }],
});
const mockInvite = async () => ({ success: true });
const alex = { public_id: "a3f9c2xz7e", full_name: "Alex Kim" };

const meta: Meta<typeof FollowingFeed> = {
  title: "Components/FollowingFeed",
  component: FollowingFeed,
  args: {
    today: "2026-11-07",
    searchAction: mockSearch,
    inviteAction: mockInvite,
    people: [
      { ...remiAndMax, status: "approved" },
      { ...alex, status: "approved" },
      { public_id: "u2q6r8kd3m", full_name: "Tin Man", status: "pending" },
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

// Not following anyone yet: the search box and an empty state.
export const NotFollowingAnyone: Story = {
  args: { people: [], registries: [] },
};
