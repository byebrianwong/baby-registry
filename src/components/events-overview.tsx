import Link from "next/link";
import { CalendarHeart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventCard, type EventCardProps } from "@/components/event-card";

export interface EventsOverviewProps {
  /** Today and later, soonest first. Events with no date come last. */
  upcoming: (EventCardProps & { id: string })[];
  /** Before today, most recent first. */
  past: (EventCardProps & { id: string })[];
  /** Put in front of the New Event link. The demo passes "/demo". */
  basePath?: string;
}

export function NewEventButton({ basePath = "" }: { basePath?: string }) {
  return (
    <Button asChild>
      <Link href={`${basePath}/dashboard/events/new`}>
        <span className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4 shrink-0" />
          New Event
        </span>
      </Link>
    </Button>
  );
}

/** The Events tab on the dashboard. Its page (dashboard/(tabs)/events) loads the events. */
export function EventsOverview({ upcoming, past, basePath = "" }: EventsOverviewProps) {
  const none = upcoming.length === 0 && past.length === 0;

  return (
    <div className="container mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          {/* The Events tab is the visible title (see (tabs)/layout.tsx). */}
          <h1 className="sr-only">Events</h1>
          <p className="text-tertiary">Send invitations and track RSVPs</p>
        </div>
        <NewEventButton basePath={basePath} />
      </div>

      {none ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-blush-100">
              <CalendarHeart aria-hidden="true" className="size-8 text-blush-700" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">Plan your first event</h2>
            <p className="mt-2 max-w-md text-tertiary">
              A baby shower, a birthday, a holiday party: upload your invitation, email it to guests, and see who&apos;s
              coming. Link your registry so guests know what to bring.
            </p>
            <div className="mt-6">
              <NewEventButton basePath={basePath} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(({ id, ...card }) => (
                <EventCard key={id} {...card} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-semibold">Past events</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {past.map(({ id, ...card }) => (
                  <EventCard key={id} {...card} headingLevel={3} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
