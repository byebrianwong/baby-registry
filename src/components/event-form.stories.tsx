import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EventForm } from "./event-form";
import { sampleEvent, sampleLinkedRegistries } from "@/lib/event-sample-data";

const registries = [
  { id: sampleEvent.registry_id!, title: "Remi & Max's Baby Registry" },
  { id: "00000000-0000-4000-8000-000000000003", title: "Max's Birthday Wishlist" },
];

const meta: Meta<typeof EventForm> = {
  title: "Components/EventForm",
  component: EventForm,
  parameters: { layout: "padded" },
  args: {
    registries,
    createAction: fn(async () => ({ error: "This is a story, so nothing was saved." })),
    updateAction: fn(async () => ({ error: "This is a story, so nothing was saved." })),
    setImageAction: fn(async () => ({ error: null })),
    uploadImage: fn(async () => ({ url: "/samples/invitation.svg" })),
    lookupAction: fn(async () => ({ error: "This is a story, so no link was looked up." })),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof EventForm>;

// A fixed time zone, so the snapshot doesn't depend on where it's taken.
export const NewEvent: Story = {
  args: { initial: { time_zone: "America/Los_Angeles" } },
};

export const EditingWithPicture: Story = {
  args: { eventId: sampleEvent.id, initial: sampleEvent },
};

/**
 * The Gifts and Gift exchange sections filled in. The event links the host's
 * own registry and one they added by pasting its link, which shows whose it
 * is. Guests also say how many kids are coming.
 */
export const EditingWithGiftsAndExchange: Story = {
  args: {
    eventId: sampleEvent.id,
    initial: {
      ...sampleEvent,
      image_url: null,
      ask_kids: true,
      gift_note: "Gifts are optional. If you'd like to bring something, here's what Remi & Max still need.",
    },
    linkedRegistries: [
      { id: registries[0].id, title: registries[0].title },
      {
        id: sampleLinkedRegistries[1].id,
        title: sampleLinkedRegistries[1].title,
        honoree: sampleLinkedRegistries[1].honoree,
        link: `https://regibee.com/r/${sampleLinkedRegistries[1].slug}`,
      },
    ],
    exchange: { budget: "$15", draw_by: "2026-03-07", mailed: false, drawn_at: null },
  },
};
