import Link from "next/link";
import { CookingPot, ExternalLink, PartyPopper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { countdownLabel } from "@/lib/occasion-theme";
import { eventTheme, eventTypeLabel, formatShortEventDate, type EventType, type RsvpSummary } from "@/lib/events";
import { cx } from "@/lib/utils/cx";

export interface EventCardProps {
  title: string;
  eventType: EventType;
  /** YYYY-MM-DD, or null when the event has no date yet. */
  eventDate: string | null;
  /** "2 – 5 PM PDT" */
  time: string | null;
  imageUrl: string | null;
  /** YYYY-MM-DD. Passed in so stories get a fixed countdown. */
  today: string;
  summary: Pick<RsvpSummary, "guests" | "attending" | "maybe" | "pending" | "invited">;
  manageHref: string;
  publicHref: string;
  /** Shown next to the title, like "Co-host" for events on a registry you help manage. */
  badge?: string;
  headingLevel?: 2 | 3;
}

/** An event on the host's Events tab. */
export function EventCard({
  title,
  eventType,
  eventDate,
  time,
  imageUrl,
  today,
  summary,
  manageHref,
  publicHref,
  badge,
  headingLevel = 2,
}: EventCardProps) {
  const theme = eventTheme(eventType);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const stats =
    summary.guests === 0
      ? "No guests yet"
      : [
          `${summary.attending} going`,
          summary.maybe > 0 ? `${summary.maybe} maybe` : null,
          `${summary.pending} no reply`,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className={cx("relative flex h-32 items-center justify-center", imageUrl ? "bg-secondary" : theme.bg)}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded pictures from Supabase Storage
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-primary">
            {eventType === "meal_train" ? (
              <CookingPot aria-hidden="true" className={cx("size-6", theme.icon)} />
            ) : (
              <PartyPopper aria-hidden="true" className={cx("size-6", theme.icon)} />
            )}
          </span>
        )}
        {eventDate && (
          <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary shadow-sm">
            {countdownLabel(eventDate, today, "personal")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className={cx("text-xs font-semibold tracking-wide uppercase", theme.text)}>{eventTypeLabel(eventType)}</p>
          <div className="mt-1 flex items-start gap-2">
            <Heading className="min-w-0 flex-1 text-lg leading-snug font-semibold text-primary">
              <Link href={manageHref} className="outline-focus-ring hover:underline focus-visible:outline-2">
                {title}
              </Link>
            </Heading>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-tertiary">
            {eventDate ? `${formatShortEventDate(eventDate)}${time ? ` · ${time}` : ""}` : "No date yet"}
          </p>
        </div>
        <p className="text-sm text-secondary">{stats}</p>
        <div className="mt-auto flex gap-2">
          <Button size="sm" className="flex-1" asChild>
            <Link href={manageHref}>Guests & RSVPs</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={publicHref} target="_blank" rel="noopener noreferrer" aria-label={`View ${title} invitation`}>
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="size-4 shrink-0" />
                View
              </span>
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
