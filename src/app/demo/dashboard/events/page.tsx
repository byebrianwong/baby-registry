"use client";

import { EventsOverview, type EventsOverviewProps } from "@/components/events-overview";
import { DEMO_ME_ID, demoEvents, isDemoHost } from "@/lib/demo-events";
import { demoOwnRegistries } from "@/lib/demo-registries";
import { formatEventTime, formatShortEventDate, summarizeRsvps } from "@/lib/events";
import { useDemoToday } from "../../demo-today";
import { DemoOwnerShell } from "../../_components/demo-shell";

/** The demo's Events tab. Like src/app/(protected)/dashboard/(tabs)/events/page.tsx. */
export default function DemoEventsPage() {
  const today = useDemoToday();
  const events = demoEvents(today);
  const upcoming: EventsOverviewProps["upcoming"] = [];
  const past: EventsOverviewProps["past"] = [];

  for (const event of events.filter(isDemoHost)) {
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
  // Past events read better most recent first.
  past.reverse();

  // Events someone else hosts that link Remi & Max's registries, like the meal train.
  const own = new Map(demoOwnRegistries(today).map((r) => [r.id, r.title]));
  const linked = events
    .filter((e) => !isDemoHost(e) && e.registryId && own.has(e.registryId))
    .filter((e) => !e.event_date || e.event_date >= today)
    .map((e) => ({
      id: e.id,
      title: e.title,
      dateText: e.event_date ? formatShortEventDate(e.event_date) : null,
      registryTitles: [own.get(e.registryId as string) as string],
      href: `/demo/e/${e.slug}`,
    }));

  return (
    <DemoOwnerShell tabs>
      <EventsOverview upcoming={upcoming} past={past} linked={linked} basePath="/demo" />
    </DemoOwnerShell>
  );
}
