import type { Meta, StoryObj } from "@storybook/react";
import { GuestWishLists } from "./guest-wish-lists";
import { sampleExchangeEvent, sampleGuestWishLists } from "@/lib/event-sample-data";

// Everyone's wish lists on an everyone-gives-everyone invitation
// (src/app/e/[slug]/page.tsx). Only the event's guests and hosts see it.

const meta: Meta<typeof GuestWishLists> = {
  title: "Components/GuestWishLists",
  component: GuestWishLists,
  parameters: { layout: "padded" },
  args: {
    lists: sampleGuestWishLists,
    eventSlug: sampleExchangeEvent.slug,
    guestToken: "token-g1",
    waitingCount: 2,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof GuestWishLists>;

/**
 * Glinda, on her own invitation link. Her list is first, with no button:
 * nobody sees what's been reserved from their own list. Elphaba's and
 * Fiyero's open through the event, Boq hasn't added one yet, and two guests
 * haven't answered.
 */
export const AsAGuest: Story = {};

/** A guest who hasn't linked their own list yet. */
export const NoListOfYourOwn: Story = {
  args: {
    lists: sampleGuestWishLists.map((entry) =>
      entry.isYou ? { ...entry, url: null, registry: null } : entry,
    ),
  },
};

/** The host, looking at the invitation without being on the guest list. */
export const HostView: Story = {
  args: {
    lists: sampleGuestWishLists.map((entry) => ({ ...entry, isYou: false })),
    guestToken: null,
    hostView: true,
  },
};

/** Before anyone has RSVPed. */
export const NobodyYet: Story = {
  args: { lists: [], waitingCount: 6 },
};

/** On a phone, the buttons go under each name. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1" } },
};
