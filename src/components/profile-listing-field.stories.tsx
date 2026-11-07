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

export const Listed: Story = {};

export const NotListed: Story = {
  args: { isSelected: false },
};

export const ListedWithShippingAddress: Story = {
  args: { hasShippingAddress: true },
};

export const PrivateRegistry: Story = {
  args: { isPublic: false },
};

export const NoProfileYet: Story = {
  args: { username: null },
};
