import type { Meta, StoryObj } from "@storybook/react";
import { FollowButton } from "./follow-button";
import { PublicProfile } from "./public-profile";

const mockFollow = async () => ({ success: true });

const meta: Meta<typeof PublicProfile> = {
  title: "Components/PublicProfile",
  component: PublicProfile,
  args: {
    username: "jane-doe",
    fullName: "Jane & John Doe",
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
        title: "Jane's Wishlist",
        event_date: null,
        registry_type: "personal",
        event_type: null,
        is_public: true,
      },
      {
        slug: "christmas",
        title: "The Doe Family Christmas",
        event_date: "2026-12-25",
        registry_type: "personal",
        event_type: "christmas",
        is_public: true,
      },
      {
        slug: "baby",
        title: "The Doe Family Baby Registry",
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
    followAction: <FollowButton username="jane-doe" state="approved" cancelAction={mockFollow} />,
  },
};

export const VisitorNotFollowing: Story = {
  args: {
    registries: [],
    followAction: (
      <FollowButton username="jane-doe" state="none" requestAction={mockFollow} cancelAction={mockFollow} />
    ),
  },
};

export const VisitorSignedOut: Story = {
  args: {
    followAction: <FollowButton username="jane-doe" state="signed-out" />,
  },
};

export const OwnProfile: Story = {
  args: { isOwnProfile: true },
};

export const NothingListed: Story = {
  args: { registries: [] },
};

export const OwnProfileNothingListed: Story = {
  args: { registries: [], isOwnProfile: true },
};

export const NoDisplayName: Story = {
  args: { fullName: null },
};

export const LongNames: Story = {
  args: {
    fullName: "Bartholomew Maximilian Montgomery-Featherstonehaugh & Wilhelmina Fitzgerald",
    username: "bartholomew-montgomery-feathers",
    registries: [
      {
        slug: "long",
        title: "Bartholomew and Wilhelmina's Extremely Long and Very Detailed Wedding Registry for the Big Day",
        event_date: "2027-06-19",
        registry_type: "personal",
        event_type: "wedding",
        is_public: true,
      },
    ],
  },
};
