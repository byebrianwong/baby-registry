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

// The shower Glinda made, as its co-hosts see it: RSVPs, guests' answers, a
// message sent, and the other hosts.
export const BabyShower: Story = { args: { eventId: "baby-shower" } };

// Max's dinner, where four guests haven't been sent the invitation yet.
export const NotSentYet: Story = { args: { eventId: "max-30th" } };

// Christmas dinner, where everyone gives everyone: who added a wish list, and
// the "Bring a dish" sheet.
export const FamilyChristmas: Story = {
  parameters: demoPageParameters("/demo/dashboard/events/christmas"),
  args: { eventId: "christmas" },
};

// A Secret Santa after the draw, with a couple kept apart.
export const SecretSanta: Story = {
  parameters: demoPageParameters("/demo/dashboard/events/secret-santa"),
  args: { eventId: "secret-santa" },
};
