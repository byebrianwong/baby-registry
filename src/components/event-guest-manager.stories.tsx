import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import { EventGuestManager } from "./event-guest-manager";
import { sampleEvent, sampleGuests } from "@/lib/event-sample-data";

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
    },
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
