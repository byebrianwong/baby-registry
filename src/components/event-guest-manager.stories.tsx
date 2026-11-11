import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import { EventGuestManager } from "./event-guest-manager";
import { guestForHost } from "@/lib/events";
import { sampleEvent, sampleExchangeEvent, sampleExchangeGuests, sampleGuests } from "@/lib/event-sample-data";

const ok = fn(async () => ({ error: null }));

const meta: Meta<typeof EventGuestManager> = {
  title: "Components/EventGuestManager",
  component: EventGuestManager,
  parameters: { layout: "padded" },
  args: {
    eventId: sampleEvent.id,
    eventSlug: sampleEvent.slug,
    guests: sampleGuests,
    maxPartySize: 2,
    replyToEmail: "linda@example.com",
    origin: "https://regibee.com",
    actions: {
      addGuests: fn(async () => ({ error: null, added: 1, alreadyListed: 0 })),
      sendInvites: fn(async () => ({ error: null, sent: 1 })),
      sendReminders: fn(async () => ({ error: null, sent: 1 })),
      setRsvp: ok,
      updateGuest: ok,
      removeGuest: ok,
      copyGuests: fn(async () => ({ error: null, added: 3, alreadyListed: 1 })),
      inviteGroup: fn(async () => ({ error: null, added: 4, alreadyListed: 2 })),
      saveAsGroup: fn(async () => ({ error: null, groupId: "group-1" })),
    },
    eventTitle: sampleEvent.title,
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof EventGuestManager>;

export const WithGuests: Story = {};

/** Before anyone's added. */
export const NoGuests: Story = { args: { guests: [] } };

/** Clicking Send invitations asks first, and says where replies go. */
export const ConfirmingSend: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Send invitations" }));
    await expect(canvas.getByText("Email the invitation to 1 guest now?")).toBeVisible();
    await expect(canvas.getByText(/goes to linda@example.com/)).toBeVisible();
  },
};

/** A guest's Edit button: their details, their RSVP, and their own link. */
export const EditingGuest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Edit Glinda Upland" }));
    const dialog = within(await screen.findByRole("dialog"));
    // In the document, not "visible": the dialog fades in, and Chromatic
    // snapshots the end of the fade.
    await expect(dialog.getByText(/token-g1/)).toBeInTheDocument();
  },
};

/**
 * The holiday party: it asks how many kids are coming and has a gift
 * exchange, so the list shows kids and who's in the exchange. The host can
 * also copy guests from their other events.
 */
export const KidsAndGiftExchange: Story = {
  args: {
    eventId: sampleExchangeEvent.id,
    eventSlug: sampleExchangeEvent.slug,
    // As the host's page gets them: wishlists hidden, who drew whom left out.
    guests: sampleExchangeGuests.map(guestForHost),
    maxPartySize: sampleExchangeEvent.max_party_size,
    askKids: true,
    hasExchange: true,
    copySources: [
      { id: sampleEvent.id, title: sampleEvent.title, guestCount: sampleGuests.length },
      { id: "00000000-0000-4000-8000-000000000005", title: "Max Turns 30", guestCount: 1 },
    ],
    groups: [
      { id: "group-1", name: "The Chens", memberCount: 6 },
      { id: "group-2", name: "Book club", memberCount: 1 },
    ],
  },
};

/** "Save as a group" names a group made of everyone on the list. */
export const SavingAsGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save as a group" }));
    const dialog = within(await screen.findByRole("dialog"));
    // In the document, not "visible": the dialog fades in, and Chromatic
    // snapshots the end of the fade.
    await expect(dialog.getByLabelText("Group name")).toHaveValue(sampleEvent.title);
  },
};
