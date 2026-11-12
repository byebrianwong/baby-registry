import { CalendarDays, CalendarPlus, Clock, CookingPot, Gift, MapPin, PartyPopper, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  eventTheme,
  eventTypeLabel,
  formatEventDate,
  formatEventTime,
  mapsUrl,
  type EventDetails,
  type GiftExchange,
  type LinkedRegistry,
} from "@/lib/events";
import { formatPrice } from "@/lib/money";
import { SignupSheetSection, type InvitationSignup } from "@/components/signup-sheet";
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
> &
  Partial<Pick<EventDetails, "gift_note">>;

/** A registry linked to the event, as the invitation shows it. */
export interface InvitationRegistry extends LinkedRegistry {
  /** Whose list it is: "Remi & Max". */
  honoree?: string | null;
  /** A few gifts still needed, shown as a row of pictures. */
  items?: { id: string; title: string; image_url: string | null; price: number | null }[];
  /** How many items still need a giver. */
  itemsLeft?: number;
}

export interface EventInvitationProps {
  event: InvitationEvent;
  /** The registries the event links, in order. */
  registries?: InvitationRegistry[];
  /** @deprecated One registry, from before events could link several. Use registries. */
  registry?: LinkedRegistry | null;
  /** The event's gift exchange, when it has one. */
  exchange?: Pick<GiftExchange, "budget" | "draw_by" | "mailed" | "drawn_at"> | null;
  /**
   * The event's slug and the guest's RSVP token. With both, gift links go
   * through the event, which tells the registry who the guest is.
   */
  eventSlug?: string;
  guestToken?: string | null;
  /** Add-to-calendar links, when the event has a date. */
  calendar?: { google: string; ics: string } | null;
  /** The event's sign-up sheet, as this guest sees it. */
  signup?: InvitationSignup | null;
  /**
   * A meal train's drop-off address, held back until the guest signs up.
   * The event passed in has no address; this says there is one.
   */
  addressHidden?: boolean;
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
export function EventInvitation({
  event,
  registries: registryList,
  registry,
  exchange = null,
  eventSlug,
  guestToken,
  calendar,
  signup = null,
  addressHidden = false,
  children,
  basePath = "",
}: EventInvitationProps) {
  const registries: InvitationRegistry[] = registryList ?? (registry ? [registry] : []);
  const giftHref = (slug: string) =>
    guestToken && eventSlug && !basePath
      ? `/e/${eventSlug}/gifts?g=${encodeURIComponent(guestToken)}&to=${encodeURIComponent(slug)}`
      : `${basePath}/r/${slug}`;
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
            {/* A meal train is help after a birth, an illness or a loss, not a party. */}
            {event.event_type === "meal_train" ? (
              <CookingPot aria-hidden="true" className={cx("size-7", theme.icon)} />
            ) : (
              <PartyPopper aria-hidden="true" className={cx("size-7", theme.icon)} />
            )}
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
          {addressHidden && (
            <DetailRow icon={MapPin}>
              <p>The drop-off address shows here once you sign up for a day.</p>
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

        {(registries.length > 0 || event.gift_note) && (
          <section aria-labelledby="gifts-heading" className="flex flex-col gap-4 rounded-2xl bg-brand-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
                <Gift aria-hidden="true" className="size-4.5 text-brand-600" />
              </span>
              <div className="min-w-0 pt-1">
                <h2 id="gifts-heading" className="font-medium text-primary">
                  Gifts
                </h2>
                {event.gift_note && <p className="mt-1 whitespace-pre-line text-secondary">{event.gift_note}</p>}
              </div>
            </div>
            {registries.map((linked) => (
              <div key={linked.slug} className="flex flex-col gap-3 rounded-xl bg-primary p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{linked.title}</p>
                    {(linked.honoree || linked.itemsLeft !== undefined) && (
                      <p className="text-sm text-tertiary">
                        {[
                          linked.honoree ? `${linked.honoree}'s registry` : null,
                          linked.itemsLeft !== undefined
                            ? linked.itemsLeft === 0
                              ? "Every gift is taken"
                              : `${linked.itemsLeft} ${linked.itemsLeft === 1 ? "gift" : "gifts"} still needed`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" asChild>
                    <a href={giftHref(linked.slug)}>View registry</a>
                  </Button>
                </div>
                {linked.items && linked.items.length > 0 && (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {linked.items.map((item) => (
                      <li key={item.id}>
                        <a href={giftHref(linked.slug)} className="group flex flex-col gap-1">
                          <span className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-secondary">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element -- product pictures from any store
                              <img src={item.image_url} alt="" className="size-full object-contain p-1.5" />
                            ) : (
                              <Gift aria-hidden="true" className="size-6 text-quaternary" />
                            )}
                          </span>
                          <span className="line-clamp-2 text-xs font-medium text-secondary group-hover:text-primary">
                            {item.title}
                          </span>
                          {item.price !== null && <span className="text-xs text-tertiary">{formatPrice(item.price)}</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {signup && <SignupSheetSection signup={signup} />}

        {exchange && (
          <section aria-labelledby="exchange-heading" className="flex items-start gap-3 rounded-2xl bg-mint-50 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <Shuffle aria-hidden="true" className="size-4.5 text-mint-800" />
            </span>
            <div className="min-w-0 pt-1">
              <h2 id="exchange-heading" className="font-medium text-primary">
                Gift exchange
              </h2>
              <p className="mt-1 text-secondary">
                Everyone who joins draws one name and gives that person a gift
                {exchange.budget ? `, about ${exchange.budget}` : ""}. Nobody knows who drew them.
              </p>
              <p className="mt-1 text-sm text-tertiary">
                {exchange.drawn_at
                  ? "Names have been drawn."
                  : exchange.draw_by
                    ? `Names are drawn by ${formatEventDate(exchange.draw_by)}.`
                    : "Names are drawn once everyone's in."}{" "}
                {exchange.mailed ? "Gifts are mailed, so you'll add a shipping address." : "Bring your gift to the party."}
              </p>
            </div>
          </section>
        )}

        {children}
      </div>
    </div>
  );
}
