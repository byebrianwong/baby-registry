import type { Meta, StoryObj } from "@storybook/react";
import { FollowingFeed } from "./following-feed";

const jane = { username: "jane-doe", full_name: "Jane & John Doe" };
const alex = { username: "alex-kim", full_name: "Alex Kim" };

const meta: Meta<typeof FollowingFeed> = {
  title: "Components/FollowingFeed",
  component: FollowingFeed,
  args: {
    hasUsername: true,
    today: "2026-11-07",
    people: [
      { ...jane, status: "approved" },
      { ...alex, status: "approved" },
      { username: "priya-r", full_name: "Priya Raman", status: "pending" },
    ],
    registries: [
      { slug: "jane-baby", title: "The Doe Family Baby Registry", event_date: "2027-02-10", registry_type: "baby", event_type: null, is_public: false, owner: jane },
      { slug: "alex-xmas", title: "Alex's Christmas List", event_date: "2026-12-25", registry_type: "personal", event_type: "christmas", is_public: true, owner: alex },
      { slug: "jane-wishlist", title: "Jane's Wishlist", event_date: null, registry_type: "personal", event_type: null, is_public: true, owner: jane },
      { slug: "alex-housewarming", title: "Our New Home", event_date: "2026-03-14", registry_type: "personal", event_type: "housewarming", is_public: true, owner: alex },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof FollowingFeed>;

export const WithRegistries: Story = {};

export const WaitingForApproval: Story = {
  args: {
    people: [{ username: "priya-r", full_name: "Priya Raman", status: "pending" }],
    registries: [],
  },
};

export const NotFollowingAnyone: Story = {
  args: { people: [], registries: [] },
};

export const NoUsername: Story = {
  args: { hasUsername: false, people: [], registries: [] },
};
