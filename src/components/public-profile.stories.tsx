import type { Meta, StoryObj } from "@storybook/react";
import { FollowButton } from "./follow-button";
import { PublicProfile } from "./public-profile";

const mockFollow = async () => ({ success: true });

const meta: Meta<typeof PublicProfile> = {
  title: "Components/PublicProfile",
  component: PublicProfile,
  args: {
    username: "remi-and-max",
    fullName: "Remi & Max",
    today: "2026-11-02",
    registries: [
      {
        slug: "past-housewarming",
        title: "Our New Home",
        event_date: "2026-03-14",
        registry_type: "personal",
        event_type: "housewarming",
        is_public: true,
      },
      {
        slug: "anytime-wishlist",
        title: "Remi's Wishlist",
        event_date: null,
        registry_type: "personal",
        event_type: null,
        is_public: true,
      },
      {
        slug: "christmas",
        title: "Remi & Max's Christmas",
        event_date: "2026-12-25",
        registry_type: "personal",
        event_type: "christmas",
        is_public: true,
      },
      {
        slug: "baby",
        title: "Remi & Max's Baby Registry",
        event_date: "2027-02-10",
        registry_type: "baby",
        event_type: null,
        is_public: false,
      },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof PublicProfile>;

// What an approved follower or the owner sees: private ones carry a badge.
export const WithRegistries: Story = {
  args: {
    followAction: <FollowButton username="remi-and-max" state="approved" cancelAction={mockFollow} />,
  },
};

// A visitor who doesn't follow yet, and nothing they can see: the empty state.
export const VisitorNotFollowing: Story = {
  args: {
    registries: [],
    followAction: (
      <FollowButton username="remi-and-max" state="none" requestAction={mockFollow} cancelAction={mockFollow} />
    ),
  },
};

// The owner's own page: "Edit profile" in place of the follow button, and a
// link to choose registries in the empty state.
export const OwnProfileNothingListed: Story = {
  args: { registries: [], isOwnProfile: true },
};

