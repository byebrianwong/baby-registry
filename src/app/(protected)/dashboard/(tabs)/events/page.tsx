import { redirect } from "next/navigation";
import { EventsOverview, type EventsOverviewProps } from "@/components/events-overview";
import { formatEventTime, summarizeRsvps } from "@/lib/events";
import { listEventsForUser } from "@/lib/events-server";
import { getViewer } from "@/lib/viewer";

export default async function EventsPage() {
  // Guests (anonymous sessions) don't have events. Cached, so the tabs reuse it.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const events = await listEventsForUser(viewer.id);
  // YYYY-MM-DD in UTC, like the other dashboard tabs.
  const today = new Date().toISOString().slice(0, 10);

  const upcoming: EventsOverviewProps["upcoming"] = [];
  const past: EventsOverviewProps["past"] = [];
  for (const event of events) {
    const card = {
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      eventDate: event.event_date,
      time: formatEventTime(event),
      imageUrl: event.image_url,
      today,
      summary: summarizeRsvps(event.event_guests),
      manageHref: `/dashboard/events/${event.id}`,
      publicHref: `/e/${event.slug}`,
      badge: event.owner_id === viewer.id ? undefined : "Co-host",
    };
    if (event.event_date && event.event_date < today) past.push(card);
    else upcoming.push(card);
  }
  // The list comes soonest first, with no-date events last. Past events read
  // better most recent first.
  past.reverse();

  return <EventsOverview upcoming={upcoming} past={past} />;
}
