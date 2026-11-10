import { CalendarDays, CalendarPlus, Clock, Gift, MapPin, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  eventTheme,
  eventTypeLabel,
  formatEventDate,
  formatEventTime,
  mapsUrl,
  type EventDetails,
  type LinkedRegistry,
} from "@/lib/events";
import { cx } from "@/lib/utils/cx";

export type InvitationEvent = Pick<
  EventDetails,
  | "event_type"
  | "title"
  | "hosted_by"
  | "event_date"
  | "start_time"
  | "end_time"
  | "time_zone"
  | "location_name"
  | "location_address"
  | "message"
  | "image_url"
  | "rsvp_by"
>;

export interface EventInvitationProps {
  event: InvitationEvent;
  registry: LinkedRegistry | null;
  /** Add-to-calendar links, when the event has a date. */
  calendar?: { google: string; ics: string } | null;
  /** The RSVP form, under the details. */
  children?: React.ReactNode;
  /** Put in front of the registry link. The demo passes "/demo". */
  basePath?: string;
}

function DetailRow({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon aria-hidden="true" className="size-4.5 text-brand-600" />
      </span>
      <div className="min-w-0 pt-1.5 text-secondary">{children}</div>
    </div>
  );
}

/**
 * The event as guests see it: the invitation picture, the details, a link to
 * the registry, and the RSVP form below. The public event page and the host's
 * preview both use it.
 */
export function EventInvitation({ event, registry, calendar, children, basePath = "" }: EventInvitationProps) {
  const theme = eventTheme(event.event_type);
  const time = formatEventTime(event);
  const map = mapsUrl(event);
  const hasImage = Boolean(event.image_url);

  return (
    <div
      className={cx(
        "mx-auto w-full",
        hasImage ? "max-w-5xl lg:grid lg:grid-cols-2 lg:items-start lg:gap-12" : "max-w-xl",
      )}
    >
      {hasImage ? (
        <div className="lg:sticky lg:top-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded pictures of any size, from Supabase Storage */}
          <img
            src={event.image_url!}
            alt={`${event.title} invitation`}
            className="mx-auto block h-auto max-h-[80vh] w-auto max-w-full rounded-2xl shadow-lg ring-1 ring-black/5"
          />
        </div>
      ) : (
        <div className={cx("flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center", theme.bg)}>
          <span className="flex size-14 items-center justify-center rounded-full bg-primary">
            <PartyPopper aria-hidden="true" className={cx("size-7", theme.icon)} />
          </span>
          <p className={cx("text-sm font-semibold tracking-wide uppercase", theme.text)}>
            {eventTypeLabel(event.event_type)}
          </p>
        </div>
      )}

      <div className={cx("flex flex-col gap-6", hasImage ? "mt-8 lg:mt-0" : "mt-8")}>
        <div>
          {hasImage && (
            <p className={cx("text-sm font-semibold tracking-wide uppercase", theme.text)}>
              {eventTypeLabel(event.event_type)}
            </p>
          )}
          <h1 className="mt-1 font-display text-4xl leading-tight font-bold tracking-tight text-primary">
            {event.title}
          </h1>
          {event.hosted_by && <p className="mt-2 text-lg text-secondary">Hosted by {event.hosted_by}</p>}
        </div>

        <div className="flex flex-col gap-4">
          {event.event_date && (
            <DetailRow icon={CalendarDays}>
              <p className="font-medium text-primary">{formatEventDate(event.event_date)}</p>
              {time && <p>{time}</p>}
              {calendar && (
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm max-sm:gap-y-0">
                  <a
                    href={calendar.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline max-sm:min-h-11"
                  >
                    <CalendarPlus aria-hidden="true" className="size-3.5" />
                    Google Calendar
                  </a>
                  <a href={calendar.ics} className="font-medium text-brand-600 hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center">
                    Apple or Outlook (.ics)
                  </a>
                </p>
              )}
            </DetailRow>
          )}
          {(event.location_name || event.location_address) && (
            <DetailRow icon={MapPin}>
              {event.location_name && <p className="font-medium text-primary">{event.location_name}</p>}
              {event.location_address && <p className="whitespace-pre-line">{event.location_address}</p>}
              {map && (
                <a
                  href={map}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-brand-600 hover:underline max-sm:mt-0 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
                >
                  Open in Maps
                </a>
              )}
            </DetailRow>
          )}
          {event.rsvp_by && (
            <DetailRow icon={Clock}>
              <p>Please reply by {formatEventDate(event.rsvp_by)}</p>
            </DetailRow>
          )}
        </div>

        {event.message && (
          <p className="text-lg leading-relaxed whitespace-pre-line text-secondary">{event.message}</p>
        )}

        {registry && (
          <div className="flex flex-col gap-3 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
                <Gift aria-hidden="true" className="size-4.5 text-brand-600" />
              </span>
              <div>
                <p className="font-medium text-primary">Gift registry</p>
                <p className="text-sm text-tertiary">{registry.title}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <a href={`${basePath}/r/${registry.slug}`}>View registry</a>
            </Button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
