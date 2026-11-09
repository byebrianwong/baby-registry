import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EventForm } from "./event-form";
import { sampleEvent } from "@/lib/event-sample-data";

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
