import Link from "next/link";
import { ExternalLink, PartyPopper, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RegistryIcon } from "@/components/registry-icon";
import { initialsFor } from "@/lib/initials";
import { countdownLabel, occasionTheme } from "@/lib/occasion-theme";
import type { PersonalEventType, RegistryType } from "@/lib/types";
import { cx } from "@/lib/utils/cx";

export interface RegistryActivity {
  id: string;
  name: string;
  /** What they did, after their name: "reserved an item". */
  action: string;
}

export interface DashboardRegistryCardProps {
  title: string;
  registryType: RegistryType;
  eventType: PersonalEventType | null;
  /** YYYY-MM-DD, or null when the registry has no date. */
  eventDate: string | null;
  /** YYYY-MM-DD. Passed in so stories and tests get a fixed countdown. */
  today: string;
  totalItems: number;
  fulfilledItems: number;
  totalValue: number;
  recentActivity: RegistryActivity[];
  manageHref: string;
  publicHref: string;
  /** Shown next to the title, like "Manager" for shared registries. */
  badge?: string;
}

// Initials circles take a tint picked from the name, so one person gets the
// same color on every card.
const AVATAR_TINTS = [
  "bg-mint-100 text-mint-800",
  "bg-sunshine-100 text-sunshine-900",
  "bg-brand-100 text-brand-700",
  "bg-blush-100 text-blush-700",
];

function avatarTint(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/**
 * A registry on the owner's dashboard. The band across the top takes the
 * occasion's color and icon (src/lib/occasion-theme.ts) and counts down to the
 * event, so registries are easy to tell apart at a glance.
 */
export function DashboardRegistryCard({
  title,
  registryType,
  eventType,
  eventDate,
  today,
  totalItems,
  fulfilledItems,
  totalValue,
  recentActivity,
  manageHref,
  publicHref,
  badge,
}: DashboardRegistryCardProps) {
  const theme = occasionTheme(registryType, eventType);
  const progress = totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;
  const allDone = totalItems > 0 && fulfilledItems >= totalItems;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className={cx("flex h-16 items-center justify-between gap-3 px-5", theme.bg)}>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary">
          <RegistryIcon
            registryType={registryType}
            eventType={eventType}
            className={cx("size-5", theme.icon)}
          />
        </span>
        {eventDate && (
          <span className={cx("rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium", theme.text)}>
            {countdownLabel(eventDate, today, registryType)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-snug">
              <Link href={manageHref} className="hover:underline">
                {title}
              </Link>
            </h3>
            {badge && (
              <Badge variant="secondary" className="shrink-0">
                <Users className="mr-1 h-3 w-3" />
                {badge}
              </Badge>
            )}
          </div>
          {eventDate && (
            <p className="mt-0.5 text-sm text-tertiary">
              {new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>
              {fulfilledItems} of {totalItems} items fulfilled
            </span>
            {allDone ? (
              <span className="inline-flex items-center gap-1 font-medium text-mint-800">
                <PartyPopper aria-hidden="true" className="h-3.5 w-3.5" />
                All done
              </span>
            ) : (
              <span className="text-tertiary">{Math.round(progress)}%</span>
            )}
          </div>
          <Progress value={progress} />
        </div>

        <div className="flex justify-between text-sm text-tertiary">
          <span>{totalItems} items</span>
          <span>${totalValue.toFixed(0)} total value</span>
        </div>

        {recentActivity.length > 0 && (
          <div className="text-sm">
            <p className="mb-2 font-medium">Recent activity</p>
            <ul className="space-y-2">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex items-center gap-2 text-tertiary">
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      avatarTint(activity.name),
                    )}
                  >
                    {initialsFor(activity.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-secondary">{activity.name}</span> {activity.action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={manageHref}>Manage</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-auto" asChild>
            <Link href={publicHref} target="_blank" aria-label="View public registry (opens in a new tab)">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
