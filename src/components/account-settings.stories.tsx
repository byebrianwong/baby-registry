import type { Meta, StoryObj } from "@storybook/react";
import { AccountSettings, type AccountRegistry } from "./account-settings";

const mockSave = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return { success: true };
};
const mockList = async () => ({ success: true });

const registries: AccountRegistry[] = [
  {
    id: "1",
    title: "Remi & Max's Baby Registry",
    is_public: true,
    listed_on_profile: true,
    has_shipping_address: true,
    registry_type: "baby",
    event_type: null,
  },
  {
    id: "2",
    title: "Max's 30th Birthday",
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
    listAction: mockList as never,
  },
};
export default meta;
type Story = StoryObj<typeof AccountSettings>;

// A new account: findable by name and email, no followers yet.
export const NewAccount: Story = {
  args: {
    profile: {
      public_id: "k7m2p9qx4t",
      full_name: "Remi & Max",
      discoverable: true,
      findable_by_email: true,
    },
    follows: { requests: [], followers: [], following: [] },
  },
};

// An older account that hasn't turned on email search, with a request waiting.
export const WithFollowers: Story = {
  args: {
    profile: { public_id: "k7m2p9qx4t", full_name: "Remi & Max", discoverable: true },
    follows: {
      requests: [{ public_id: "r4d8w2nb6h", full_name: "Grandma Dorothy", status: "pending" }],
      followers: [{ public_id: "a3f9c2xz7e", full_name: "Alex Kim", status: "approved" }],
      following: [],
    },
  },
};
