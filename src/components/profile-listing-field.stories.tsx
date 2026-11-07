import type { Meta, StoryObj } from "@storybook/react";
import { ProfileListingField } from "./profile-listing-field";

const meta: Meta<typeof ProfileListingField> = {
  title: "Components/ProfileListingField",
  component: ProfileListingField,
  parameters: { layout: "centered" },
  args: {
    username: "jane-doe",
    isPublic: true,
    isSelected: true,
    onChange: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof ProfileListingField>;

// Checked, with the longest hint: the profile link plus the shipping address warning.
export const ListedWithShippingAddress: Story = {
  args: { hasShippingAddress: true },
};

// No username yet, so a link to set up a profile replaces the checkbox.
export const NoProfileYet: Story = {
  args: { username: null },
};
