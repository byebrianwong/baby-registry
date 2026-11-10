import type { Meta, StoryObj } from "@storybook/react";
import { ProfileListingField } from "./profile-listing-field";

const meta: Meta<typeof ProfileListingField> = {
  title: "Components/ProfileListingField",
  component: ProfileListingField,
  parameters: { layout: "centered" },
  args: {
    isPublic: true,
    isSelected: true,
    onChange: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof ProfileListingField>;

// Checked, with the longest hint: who can see it plus the shipping address warning.
export const ListedWithShippingAddress: Story = {
  args: { hasShippingAddress: true },
};

// Private registries only show to approved followers.
export const Private: Story = {
  args: { isPublic: false },
};
