import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ExternalLink, Gift, ImagePlus, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EventGuestManager } from "@/components/event-guest-manager";
import { EventCoHosts } from "@/components/event-co-hosts";
import { ExchangeManager } from "@/components/exchange-manager";
import { PlanAgainButton } from "@/components/plan-again-button";
import {
  eventTheme,
  eventTypeLabel,
  exchangeStatus,
  formatEventDate,
  formatEventTime,
  guestForHost,
} from "@/lib/events";
import {
  getEventForManager,
  getEventGuests,
  getEventHosts,
  getEventRegistries,
  getExchangeExclusions,
  getGiftExchange,
  getHostInvites,
  listOtherEventsForCopy,
} from "@/lib/events-server";
import { getViewer } from "@/lib/viewer";
import { cx } from "@/lib/utils/cx";
import { DeleteEventButton } from "./delete-event-button";

export const metadata: Metadata = { title: "Event | Regibee" };

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ image?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const [{ eventId }, { image }] = await Promise.all([params, searchParams]);
  const found = await getEventForManager(eventId, viewer.id);
  if (!found) notFound();
  const { event, isOwner } = found;

  const [allGuests, registries, exchange, exclusions, hosts, invites, copySources] = await Promise.all([
    getEventGuests(event.id),
    getEventRegistries(event.id),
    getGiftExchange(event.id),
    getExchangeExclusions(event.id),
    getEventHosts(event),
    getHostInvites(event.id),
    listOtherEventsForCopy(viewer.id, event.id),
  ]);
  // Worked out before the guests are trimmed for the host, since it needs the pairs.
  const status = exchange ? exchangeStatus(allGuests, exchange) : null;
  // The host never sees who drew whom, or the wishlists and addresses guests
  // were told only their Secret Santa sees.
  const guests = allGuests.map(guestForHost);
  const theme = eventTheme(event.event_type);
  const time = formatEventTime(event);
  const publicPath = `/e/${event.slug}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary max-sm:min-h-11"
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
            <Link href={`/dashboard/events/${event.id}/edit`}>
              <span className="inline-flex items-center gap-1.5">
                <Pencil className="h-4 w-4 shrink-0" />
                Edit
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {image === "failed" && (
        <p role="alert" className="mt-6 rounded-xl bg-error-secondary p-4 text-sm text-error-primary">
          Your event is saved, but the invitation picture didn&apos;t upload. Add it again from Edit.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {exchange && status && (
            <ExchangeManager
              eventId={event.id}
              exchange={exchange}
              status={status}
              guests={guests}
              exclusions={exclusions}
              editHref={`/dashboard/events/${event.id}/edit`}
            />
          )}
          <EventGuestManager
            eventId={event.id}
            eventSlug={event.slug}
            guests={guests}
            maxPartySize={event.max_party_size}
            replyToEmail={viewer.email ?? null}
            askKids={event.ask_kids}
            hasExchange={Boolean(exchange)}
            copySources={copySources}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="gap-0 overflow-hidden py-0">
            {event.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded pictures from Supabase Storage
              <img src={event.image_url} alt={`${event.title} invitation`} className="block h-auto w-full" />
            ) : (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
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
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium text-primary">Gifts</p>
                  {registries.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {registries.map((registry) => (
                        <li key={registry.id} className="text-sm">
                          <a
                            href={`/r/${registry.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:underline"
                          >
                            {registry.title}
                          </a>
                          {registry.honoree && <span className="text-tertiary"> · {registry.honoree}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-tertiary">No registry linked.</p>
                  )}
                  {event.gift_note && <p className="text-sm whitespace-pre-line text-secondary">{event.gift_note}</p>}
                  <Link href={`/dashboard/events/${event.id}/edit`} className="text-sm font-medium text-brand-600 hover:underline">
                    {registries.length > 0 || event.gift_note ? "Change gifts" : "Link a registry or add a gift note"}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <EventCoHosts eventId={event.id} hosts={hosts} invites={invites} viewerId={viewer.id} />

          <PlanAgainButton eventId={event.id} />

          {isOwner && <DeleteEventButton eventId={event.id} guestCount={guests.length} />}
        </aside>
      </div>
    </div>
  );
}
