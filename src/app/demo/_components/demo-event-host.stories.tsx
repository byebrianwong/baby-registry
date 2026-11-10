import type { Meta, StoryObj } from "@storybook/react";
import { DemoEventHost } from "./demo-event-host";
import { demoPageParameters, withDemoToday } from "../story-today";

const meta: Meta<typeof DemoEventHost> = {
  title: "Pages/Event Guests & RSVPs",
  component: DemoEventHost,
  parameters: demoPageParameters("/demo/dashboard/events/baby-shower"),
  decorators: [withDemoToday],
};
export default meta;
type Story = StoryObj<typeof DemoEventHost>;

// The shower Glinda made, as its co-hosts see it: RSVPs and a reminder to send.
export const BabyShower: Story = { args: { eventId: "baby-shower" } };

// Max's dinner, where four guests haven't been sent the invitation yet.
export const NotSentYet: Story = { args: { eventId: "max-30th" } };
