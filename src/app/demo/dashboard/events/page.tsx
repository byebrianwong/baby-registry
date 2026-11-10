"use client";

import { EventsOverview, type EventsOverviewProps } from "@/components/events-overview";
import { DEMO_ME_ID, demoEvents } from "@/lib/demo-events";
import { formatEventTime, summarizeRsvps } from "@/lib/events";
import { useDemoToday } from "../../demo-today";
import { DemoOwnerShell } from "../../_components/demo-shell";

/** The demo's Events tab. Like src/app/(protected)/dashboard/(tabs)/events/page.tsx. */
export default function DemoEventsPage() {
  const today = useDemoToday();
  const upcoming: EventsOverviewProps["upcoming"] = [];
  const past: EventsOverviewProps["past"] = [];

  for (const event of demoEvents(today)) {
    const card = {
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      eventDate: event.event_date,
      time: formatEventTime(event),
      imageUrl: event.image_url,
      today,
      summary: summarizeRsvps(event.guests),
      manageHref: `/demo/dashboard/events/${event.id}`,
      publicHref: `/demo/e/${event.slug}`,
      badge: event.owner_id === DEMO_ME_ID ? undefined : "Co-host",
    };
    if (event.event_date && event.event_date < today) past.push(card);
    else upcoming.push(card);
  }

  return (
    <DemoOwnerShell tabs>
      <EventsOverview upcoming={upcoming} past={past} basePath="/demo" />
    </DemoOwnerShell>
  );
}
