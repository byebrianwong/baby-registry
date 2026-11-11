import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EventCoHosts } from "./event-co-hosts";
import { sampleEvent } from "@/lib/event-sample-data";

// The Hosts card in the side column of the host's event page.

const ok = fn(async () => ({ error: null }));

const meta: Meta<typeof EventCoHosts> = {
  title: "Components/EventCoHosts",
  component: EventCoHosts,
  parameters: { layout: "padded" },
  args: {
    eventId: sampleEvent.id,
    actions: {
      invite: ok,
      createLink: fn(async () => ({ error: null, token: "sample-co-host-token" })),
      revoke: ok,
      remove: ok,
    },
  },
  // As wide as the page's side column.
  decorators: [
    (Story) => (
      <div className="max-w-[320px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof EventCoHosts>;

/** Linda made the event. Grandma Jo co-hosts, and an invitation to Dorothy is waiting. */
export const OwnerViewing: Story = {
  args: {
    viewerId: "user-linda",
    hosts: [
      { userId: "user-linda", name: "Linda Upland", isOwner: true },
      { userId: "user-jo", name: "Grandma Jo", isOwner: false },
    ],
    invites: [{ id: "invite-1", email: "dorothy@example.com", expires_at: "2026-03-10T18:00:00Z" }],
  },
};
