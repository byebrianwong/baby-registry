import type { Meta, StoryObj } from "@storybook/react";
import { EventsOverview } from "./events-overview";
import { DashboardTabs } from "./dashboard-tabs";
import { formatEventTime, summarizeRsvps } from "@/lib/events";
import { SAMPLE_TODAY, sampleEvent, sampleGuests } from "@/lib/event-sample-data";

// The Events tab. Its page loads events on the server, which Storybook can't
// render, so these pass the cards in.

const base = {
  today: SAMPLE_TODAY,
  manageHref: "#",
  publicHref: "#",
};

const meta: Meta<typeof EventsOverview> = {
  title: "Pages/Events",
  component: EventsOverview,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/dashboard/events" } },
  },
  render: (args) => (
    <>
      <DashboardTabs hasAccount />
      <EventsOverview {...args} />
    </>
  ),
};
export default meta;
type Story = StoryObj<typeof EventsOverview>;

export const WithEvents: Story = {
  args: {
    upcoming: [
      {
        ...base,
        id: "shower",
        title: sampleEvent.title,
        eventType: "baby_shower",
        eventDate: sampleEvent.event_date,
        time: formatEventTime(sampleEvent),
        imageUrl: sampleEvent.image_url,
        summary: summarizeRsvps(sampleGuests),
      },
      {
        ...base,
        id: "birthday",
        title: "Max Turns 30",
        eventType: "birthday",
        eventDate: "2026-04-18",
        time: "7 – 11 PM PDT",
        imageUrl: null,
        summary: { guests: 0, attending: 0, maybe: 0, pending: 0, invited: 0 },
        badge: "Co-host",
      },
      {
        ...base,
        id: "holiday",
        title: "Cookie Swap",
        eventType: "christmas",
        eventDate: null,
        time: null,
        imageUrl: null,
        summary: { guests: 4, attending: 0, maybe: 0, pending: 4, invited: 0 },
      },
    ],
    past: [
      {
        ...base,
        id: "housewarming",
        title: "Come See Our New Place",
        eventType: "housewarming",
        eventDate: "2026-01-10",
        time: "1 – 4 PM PST",
        imageUrl: null,
        summary: { guests: 18, attending: 22, maybe: 0, pending: 2, invited: 18 },
      },
    ],
  },
};

export const Empty: Story = { args: { upcoming: [], past: [] } };
