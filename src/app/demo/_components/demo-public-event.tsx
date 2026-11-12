"use client";

import { notFound } from "next/navigation";
import { EventInvitation } from "@/components/event-invitation";
import { RsvpForm } from "@/components/rsvp-form";
import { addDays } from "@/lib/demo-data";
import { findDemoEvent } from "@/lib/demo-events";
import { findDemoRegistry } from "@/lib/demo-registries";
import { eventHasPassed, googleCalendarUrl } from "@/lib/events";
import { useDemoToday } from "../demo-today";
import { DemoGuestShell } from "./demo-shell";
import { DemoGuestHeader } from "./demo-guest-header";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * A demo event as guests see it. Like src/app/e/[slug]/page.tsx: `token` is
 * the guest's own RSVP link (?g=), which greets them by name. Without one,
 * anyone can RSVP when the event allows it.
 */
export function DemoPublicEvent({ slug, token }: { slug: string; token: string | null }) {
  const today = useDemoToday();
  const event = findDemoEvent(today, { slug });
  if (!event) notFound();

  const registry = event.registryId ? findDemoRegistry(today, { id: event.registryId }) : null;
  const guest = token ? (event.guests.find((g) => g.token === token) ?? null) : null;
  const google = googleCalendarUrl(event, `${SITE_URL}/demo/e/${event.slug}`);

  return (
    <DemoGuestShell>
      <DemoGuestHeader />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <EventInvitation
          event={event}
          registry={registry ? { title: registry.title, slug: registry.slug } : null}
          calendar={google ? { google, ics: `/demo/e/${event.slug}/calendar` } : null}
          basePath="/demo"
        >
          {token && !guest && (
            <p className="rounded-xl bg-sunshine-50 p-4 text-sm text-sunshine-900">
              This RSVP link isn&apos;t on the guest list anymore. Ask the host for a new one.
            </p>
          )}
          <RsvpForm
            // A new link starts the form over.
            key={guest?.token ?? "open"}
            slug={event.slug}
            token={guest?.token ?? null}
            guest={
              guest
                ? { name: guest.name, status: guest.rsvp_status, partySize: guest.party_size, note: guest.rsvp_note }
                : null
            }
            openRsvp={event.open_rsvp}
            maxPartySize={event.max_party_size}
            passed={eventHasPassed(event, addDays(today, -1))}
            // Saved nowhere. Without a token back, the form stays on this page.
            submitAction={async () => ({ error: null })}
          />
        </EventInvitation>
      </main>
    </DemoGuestShell>
  );
}
