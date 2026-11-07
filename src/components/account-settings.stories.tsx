import type { Meta, StoryObj } from "@storybook/react";
import { AccountSettings, type AccountRegistry } from "./account-settings";

const mockSave = async (formData: FormData) => {
  await new Promise((r) => setTimeout(r, 500));
  return { success: true, username: String(formData.get("username")).toLowerCase() };
};
const mockRemove = async () => ({ success: true });
const mockList = async () => ({ success: true });

const registries: AccountRegistry[] = [
  {
    id: "1",
    title: "The Doe Family Baby Registry",
    is_public: true,
    listed_on_profile: true,
    has_shipping_address: true,
    registry_type: "baby",
    event_type: null,
  },
  {
    id: "2",
    title: "Jane's 30th Birthday",
    is_public: true,
    listed_on_profile: false,
    has_shipping_address: false,
    registry_type: "personal",
    event_type: "birthday",
  },
  {
    id: "3",
    title: "Secret Santa List",
    is_public: false,
    listed_on_profile: false,
    has_shipping_address: false,
    registry_type: "personal",
    event_type: "christmas",
  },
];

const meta: Meta<typeof AccountSettings> = {
  title: "Components/AccountSettings",
  component: AccountSettings,
  args: {
    registries,
    saveAction: mockSave as never,
    removeAction: mockRemove as never,
    listAction: mockList as never,
  },
};
export default meta;
type Story = StoryObj<typeof AccountSettings>;

// Before claiming a username, only the profile form shows.
export const NoProfileYet: Story = {
  args: { profile: { username: null, full_name: "Jane & John Doe" } },
};

// With a username: share buttons, follow lists, registries to list, and the
// turn-off card.
export const WithProfile: Story = {
  args: {
    profile: { username: "jane-doe", full_name: "Jane & John Doe" },
    follows: {
      requests: [{ username: "grandma-rose", full_name: "Rose Doe", status: "pending" }],
      followers: [{ username: "alex-friend", full_name: "Alex Kim", status: "approved" }],
      following: [],
    },
  },
};

