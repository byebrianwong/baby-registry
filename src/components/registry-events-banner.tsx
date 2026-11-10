import Link from "next/link";
import { CalendarHeart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventTypeLabel, formatShortEventDate, type EventDetails } from "@/lib/events";

export type BannerEvent = Pick<EventDetails, "id" | "title" | "event_date" | "event_type">;

/**
 * The band near the top of a registry's dashboard page. It lists the events
 * that link guests to this registry, or invites the owner to plan one.
 *
 * The events can belong to anyone who manages the registry, so they're
 * "linked", not "yours". A registry can have several (a shower and a
 * sip-and-see, say), so once one exists, planning another stays available
 * but steps back to a quieter button.
 */
export function RegistryEventsBanner({
  registryId,
  events,
}: {
  registryId: string;
  events: BannerEvent[];
}) {
  const hasEvents = events.length > 0;
  const planHref = `/dashboard/events/new?registry=${registryId}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-blush-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
          <CalendarHeart aria-hidden="true" className="h-4.5 w-4.5 text-blush-700" />
        </span>
        {hasEvents ? (
          <div>
            <p className="font-medium">{events.length === 1 ? "Linked event" : "Linked events"}</p>
            <ul className="text-sm text-tertiary">
              {events.map((event) => (
                <li key={event.id}>
                  <Link href={`/dashboard/events/${event.id}`} className="font-medium text-brand-600 hover:underline">
                    {event.title}
                  </Link>
                  {" · "}
                  {event.event_date ? formatShortEventDate(event.event_date) : eventTypeLabel(event.event_type)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <p className="font-medium">Planning a party?</p>
            <p className="text-sm text-tertiary">
              Send invitations, track RSVPs, and link guests to this registry.
            </p>
          </div>
        )}
      </div>
      <Button variant={hasEvents ? "ghost" : "outline"} size="sm" className="shrink-0" asChild>
        <Link href={planHref}>
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4 shrink-0" />
            {hasEvents ? "Plan another event" : "Plan an event"}
          </span>
        </Link>
      </Button>
    </div>
  );
}
