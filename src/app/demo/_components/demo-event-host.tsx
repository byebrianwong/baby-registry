"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Gift, ImagePlus, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EventGuestManager, type GuestManagerActions } from "@/components/event-guest-manager";
import { DeleteEventButton } from "@/app/(protected)/dashboard/events/[eventId]/delete-event-button";
import { DEMO_ME_ID, findDemoEvent } from "@/lib/demo-events";
import { DEMO_ME } from "@/lib/demo-people";
import { demoRegistryPath, findDemoRegistry } from "@/lib/demo-registries";
import { eventTheme, eventTypeLabel, formatEventDate, formatEventTime, type EventGuest } from "@/lib/events";
import { cx } from "@/lib/utils/cx";
import { useDemoToday } from "../demo-today";
import { DemoOwnerShell } from "./demo-shell";

export const DEMO_NOT_SAVED = "This is a demo, so nothing is saved. Sign up free to plan your own.";

const DAY = 24 * 60 * 60 * 1000;

/**
 * The guest list's server actions, done to a list in this page's state
 * instead. They behave like the real ones (src/lib/actions/events.ts), so
 * adding, inviting, reminding and changing RSVPs all show on the page.
 */
function useDemoGuests(initial: EventGuest[]) {
  const [guests, setGuests] = useState(initial);
  const now = () => new Date().toISOString();
  const ok = { error: null };

  const actions: GuestManagerActions = {
    addGuests: async (eventId, list) => {
      const known = new Set(guests.map((g) => g.email).filter(Boolean));
      const fresh = list.filter((g) => !g.email || !known.has(g.email.toLowerCase()));
      const stamp = Date.now();
      setGuests((current) => [
        ...current,
        ...fresh.map((g, i) => ({
          id: `new-${stamp}-${i}`,
          event_id: eventId,
          name: g.name,
          email: g.email?.toLowerCase() ?? null,
          token: `demo-new-${stamp}-${i}`,
          rsvp_status: "pending" as const,
          party_size: 1,
          rsvp_note: null,
          responded_at: null,
          invited_at: null,
          reminded_at: null,
          added_by_guest: false,
          created_at: now(),
        })),
      ]);
      return { ...ok, added: fresh.length, alreadyListed: list.length - fresh.length };
    },
    sendInvites: async (_eventId, guestIds) => {
      const sendTo = guests.filter((g) =>
        guestIds ? guestIds.includes(g.id) && g.email : g.email && !g.invited_at && g.rsvp_status === "pending",
      );
      const ids = new Set(sendTo.map((g) => g.id));
      setGuests((current) => current.map((g) => (ids.has(g.id) ? { ...g, invited_at: now() } : g)));
      return { ...ok, sent: sendTo.length };
    },
    sendReminders: async () => {
      const due = guests.filter(
        (g) =>
          g.email &&
          g.invited_at &&
          g.rsvp_status === "pending" &&
          (!g.reminded_at || Date.now() - Date.parse(g.reminded_at) >= DAY),
      );
      const ids = new Set(due.map((g) => g.id));
      setGuests((current) => current.map((g) => (ids.has(g.id) ? { ...g, reminded_at: now() } : g)));
      return { ...ok, sent: due.length };
    },
    setRsvp: async (_eventId, guestId, status, partySize) => {
      setGuests((current) =>
        current.map((g) =>
          g.id === guestId
            ? {
                ...g,
                rsvp_status: status,
                party_size: status === "no" ? 0 : Math.max(partySize, 1),
                responded_at: status === "pending" ? null : now(),
              }
            : g,
        ),
      );
      return ok;
    },
    updateGuest: async (_eventId, guestId, changes) => {
      setGuests((current) =>
        current.map((g) =>
          g.id === guestId ? { ...g, name: changes.name.trim(), email: changes.email?.toLowerCase() ?? null } : g,
        ),
      );
      return ok;
    },
    removeGuest: async (_eventId, guestId) => {
      setGuests((current) => current.filter((g) => g.id !== guestId));
      return ok;
    },
  };

  return { guests, actions };
}

/** A demo event as its host sees it. Like src/app/(protected)/dashboard/events/[eventId]/page.tsx. */
export function DemoEventHost({ eventId }: { eventId: string }) {
  const today = useDemoToday();
  const event = findDemoEvent(today, { id: eventId });
  if (!event) notFound();
  const { guests, actions } = useDemoGuests(event.guests);
  const registry = event.registry_id ? findDemoRegistry(today, { id: event.registry_id }) : null;
  const theme = eventTheme(event.event_type);
  const time = formatEventTime(event);
  const publicPath = `/demo/e/${event.slug}`;
  const editPath = `/demo/dashboard/events/${event.id}/edit`;
  const isOwner = event.owner_id === DEMO_ME_ID;

  return (
    <DemoOwnerShell>
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/demo/dashboard/events"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Events
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={cx("text-sm font-semibold tracking-wide uppercase", theme.text)}>
              {eventTypeLabel(event.event_type)}
            </p>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <div className="mt-1 flex flex-col gap-0.5 text-tertiary sm:flex-row sm:flex-wrap sm:gap-x-4">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-4" />
                {event.event_date ? `${formatEventDate(event.event_date)}${time ? ` · ${time}` : ""}` : "No date yet"}
              </span>
              {event.location_name && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-4" />
                  {event.location_name}
                </span>
              )}
            </div>
            {!isOwner && (
              <p className="mt-2 text-sm text-tertiary">
                Glinda made this event. You can manage it because it links to your registry.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton path={publicPath} />
            <Button variant="outline" asChild>
              <a href={publicPath} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Preview
                </span>
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href={editPath}>
                <span className="inline-flex items-center gap-1.5">
                  <Pencil className="h-4 w-4 shrink-0" />
                  Edit
                </span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <EventGuestManager
            eventId={event.id}
            eventSlug={event.slug}
            guests={guests}
            maxPartySize={event.max_party_size}
            replyToEmail={DEMO_ME.email}
            basePath="/demo"
            actions={actions}
          />

          <aside className="flex flex-col gap-4">
            <Card className="gap-0 overflow-hidden py-0">
              {event.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- a picture from /public
                <img src={event.image_url} alt={`${event.title} invitation`} className="block h-auto w-full" />
              ) : (
                <Link
                  href={editPath}
                  className={cx(
                    "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center hover:opacity-90",
                    theme.bg,
                  )}
                >
                  <ImagePlus aria-hidden="true" className={cx("size-8", theme.icon)} />
                  <span className="font-medium text-primary">Add your invitation</span>
                  <span className="text-sm text-secondary">Upload a picture guests see first</span>
                </Link>
              )}
              <CardContent className="p-4">
                <p className="text-sm text-tertiary">
                  Guests see this, the details and an RSVP form at the event link.
                  {event.open_rsvp ? " Anyone with the link can RSVP." : " Only invited guests can RSVP."}
                </p>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
                    <Gift aria-hidden="true" className="size-4.5 text-brand-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-primary">Gift registry</p>
                    {registry ? (
                      <a
                        href={demoRegistryPath(registry)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:underline"
                      >
                        {registry.title}
                      </a>
                    ) : (
                      <p className="text-sm text-tertiary">
                        None linked.{" "}
                        <Link href={editPath} className="text-brand-600 hover:underline">
                          Link one
                        </Link>{" "}
                        so guests know what to bring.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isOwner && (
              <DeleteEventButton
                eventId={event.id}
                guestCount={guests.length}
                deleteAction={async () => ({ error: DEMO_NOT_SAVED })}
              />
            )}
          </aside>
        </div>
      </div>
    </DemoOwnerShell>
  );
}
