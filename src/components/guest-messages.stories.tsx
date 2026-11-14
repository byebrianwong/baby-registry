import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import { GuestMessages } from "./guest-messages";
import { sampleEvent } from "@/lib/event-sample-data";
import type { EventMessage } from "@/lib/event-updates";

const messages: EventMessage[] = [
  {
    id: "m3",
    event_id: sampleEvent.id,
    sent_by: null,
    kind: "reminder",
    audience: "going",
    subject: "Tomorrow: Remi's Baby Shower",
    body: null,
    recipients: 12,
    created_at: "2026-03-13T15:00:00Z",
  },
  {
    id: "m2",
    event_id: sampleEvent.id,
    sent_by: sampleEvent.owner_id,
    kind: "change",
    audience: "not_declined",
    subject: "New time: Remi's Baby Shower",
    body: null,
    recipients: 18,
    created_at: "2026-03-05T19:00:00Z",
  },
  {
    id: "m1",
    event_id: sampleEvent.id,
    sent_by: sampleEvent.owner_id,
    kind: "message",
    audience: "going",
    subject: "Parking for Saturday",
    body: "Parking on Sunnyside fills up fast.",
    recipients: 11,
    created_at: "2026-03-01T19:00:00Z",
  },
];

const meta: Meta<typeof GuestMessages> = {
  title: "Components/GuestMessages",
  component: GuestMessages,
  parameters: { layout: "padded" },
  args: {
    eventId: sampleEvent.id,
    eventTitle: sampleEvent.title,
    counts: { going: 12, going_maybe: 15, not_declined: 19 },
    messages,
    remindDayBefore: true,
    editHref: "#",
    sendAction: fn(async () => ({ error: null, sent: 12 })),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof GuestMessages>;

/** What went out: a message, the email about a new time, and the day-before reminder. */
export const WithHistory: Story = {};

/** Nothing sent yet, and the host turned the reminder off. */
export const NothingSentYet: Story = { args: { messages: [], remindDayBefore: false } };

/**
 * The host texted everyone the link, so nobody on the list has an email
 * address. A message is posted on the invitation only.
 */
export const NoEmailAddresses: Story = {
  args: {
    counts: { going: 0, going_maybe: 0, not_declined: 0 },
    messages: [
      {
        id: "m4",
        event_id: sampleEvent.id,
        sent_by: sampleEvent.owner_id,
        kind: "message",
        audience: "going",
        subject: "Parking for Saturday",
        body: "Park on Rose Street and come in through the side gate.",
        recipients: 0,
        created_at: "2026-03-12T02:30:00Z",
      },
    ],
    sendAction: fn(async () => ({ error: null, sent: 0 })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Invitation only/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Message everyone going" }));
    const dialog = within(await screen.findByRole("dialog"));
    await expect(dialog.getByRole("button", { name: "Post on the invitation" })).toBeInTheDocument();
  },
};

/** Writing to everyone going. The choices say how many guests each one reaches. */
export const WritingAMessage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Message everyone going" }));
    const dialog = within(await screen.findByRole("dialog"));
    // In the document, not "visible": the dialog fades in, and Chromatic
    // snapshots the end of the fade.
    await expect(dialog.getByRole("button", { name: "Send to 12 guests" })).toBeInTheDocument();
  },
};
