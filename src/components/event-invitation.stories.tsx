import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { EventInvitation } from "./event-invitation";
import { RsvpForm } from "./rsvp-form";
import { sampleEvent, sampleRegistry } from "@/lib/event-sample-data";

// The public event page (src/app/e/[slug]/page.tsx) without its header and
// footer. The page reads the event on the server, which Storybook can't render.

const submitAction = fn(async () => ({ error: "This is a story, so nothing was saved." }));

const calendar = { google: "https://calendar.google.com/calendar/render", ics: "#" };

const meta: Meta<typeof EventInvitation> = {
  title: "Pages/Event Invitation (Guest View)",
  component: EventInvitation,
  parameters: { layout: "padded" },
  args: { event: sampleEvent, registry: sampleRegistry, calendar },
};
export default meta;
type Story = StoryObj<typeof EventInvitation>;

/** Someone on the plain event link: they add their name and email to RSVP. */
export const WithPicture: Story = {
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={null}
        token={null}
        openRsvp
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

/** No picture uploaded: a tinted header stands in. This guest already replied. */
export const NoPictureAlreadyReplied: Story = {
  args: { event: { ...sampleEvent, image_url: null, event_type: "birthday", title: "Max Turns 30", hosted_by: null } },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={{ name: "Glinda", status: "yes", partySize: 2, note: "Wouldn't miss it!" }}
        token="token-g1"
        openRsvp
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};

/** A guest from their invitation link picks Going, so the party size shows. */
export const ChoosingGoing: Story = {
  args: { event: { ...sampleEvent, image_url: null }, registry: null, calendar: null },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={{ name: "Fiyero", status: "pending", partySize: 1, note: null }}
        token="token-g4"
        openRsvp
        maxPartySize={4}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Going" }));
    // A pattern, because labels hold a hidden "*" for required fields.
    await expect(canvas.getByLabelText(/How many people, including you/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Send RSVP" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This is a story");
  },
};

/** The host turned off open RSVPs, and this visitor has no personal link. */
export const InviteOnly: Story = {
  args: { event: { ...sampleEvent, image_url: null }, registry: null },
  render: (args) => (
    <EventInvitation {...args}>
      <RsvpForm
        slug={sampleEvent.slug}
        guest={null}
        token={null}
        openRsvp={false}
        maxPartySize={2}
        passed={false}
        submitAction={submitAction}
      />
    </EventInvitation>
  ),
};
