import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, fn, within } from "storybook/test";
import { EventForm } from "./event-form";
import { SAMPLE_REGISTRY_ID, sampleEvent, sampleLinkedRegistries } from "@/lib/event-sample-data";
import { defaultQuestions } from "@/lib/rsvp-questions";

const registries = [
  { id: SAMPLE_REGISTRY_ID, title: "Remi & Max's Baby Registry" },
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

/** A wedding asks each person's meal, the names of plus-ones, and any dietary needs. */
export const EditingWeddingQuestions: Story = {
  args: {
    eventId: sampleEvent.id,
    initial: {
      ...sampleEvent,
      event_type: "wedding",
      title: "Alex & Sam's Wedding",
      image_url: null,
      rsvp_questions: defaultQuestions(["plus_ones", "meal", "diet"]),
    },
  },
};

/** Changing the place of an event offers to email guests about it. */
export const ChangingThePlace: Story = {
  args: { eventId: sampleEvent.id, initial: { ...sampleEvent, image_url: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Set the whole value at once. Typing into this big form doesn't always
    // reach React in the play function, though it does for a person.
    fireEvent.change(canvas.getByRole("textbox", { name: /^Place/ }), {
      target: { value: "Grandma Jo's garden, in the back" },
    });
    await expect(await canvas.findByRole("checkbox", { name: /Email guests about the new place/ })).toBeChecked();
  },
};
