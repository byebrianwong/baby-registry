import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { EventInvitation } from "@/components/event-invitation";
import { RsvpForm } from "@/components/rsvp-form";
import { PoweredByFooter } from "@/components/site-footer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getLinkedRegistry } from "@/lib/events-server";
import {
  eventHasPassed,
  formatEventDate,
  googleCalendarUrl,
  type EventDetails,
  type EventGuest,
} from "@/lib/events";
import { getViewer } from "@/lib/viewer";

// Event pages are read with the service-role client, always filtered by the
// slug in the URL (and a guest's token). The event tables have no access rules
// for the API roles, so the anon key can't list events or guests.

// Cached, so the metadata and the page share one read.
const getEvent = cache(async (slug: string): Promise<EventDetails | null> => {
  const { data } = await supabaseAdmin.from("events").select("*").eq("slug", slug).maybeSingle();
  return (data as EventDetails | null) ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event Not Found" };

  const description = [
    event.event_date ? formatEventDate(event.event_date) : null,
    event.hosted_by ? `Hosted by ${event.hosted_by}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${event.title} | Regibee`,
    description: description || `You're invited to ${event.title}`,
    // Event pages can show a home address, so they're never in search results.
    robots: { index: false, follow: false },
    // Links texted or posted to friends show the invitation picture.
    openGraph: {
      title: event.title,
      description: description || undefined,
      ...(event.image_url && { images: [{ url: event.image_url }] }),
    },
  };
}

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ g?: string }>;
}) {
  const [{ slug }, { g: token }] = await Promise.all([params, searchParams]);
  const [event, viewer] = await Promise.all([getEvent(slug), getViewer()]);
  if (!event) notFound();

  const [registry, guestResult] = await Promise.all([
    getLinkedRegistry(event.registry_id),
    token
      ? supabaseAdmin
          .from("event_guests")
          .select("name, rsvp_status, party_size, rsvp_note, token")
          .eq("event_id", event.id)
          .eq("token", token)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const guest = guestResult.data as Pick<EventGuest, "name" | "rsvp_status" | "party_size" | "rsvp_note" | "token"> | null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const eventUrl = `${siteUrl}/e/${event.slug}`;
  const google = googleCalendarUrl(event, eventUrl);
  // The event's own time zone could be a day behind UTC, so it counts as over
  // only once yesterday in UTC is past it.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-primary">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <Link href={viewer ? "/dashboard" : "/"} className="inline-flex items-center gap-2 font-semibold">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <EventInvitation
          event={event}
          registry={registry}
          calendar={google ? { google, ics: `/e/${event.slug}/calendar` } : null}
        >
          {token && !guest && (
            <p className="rounded-xl bg-sunshine-50 p-4 text-sm text-sunshine-900">
              This RSVP link isn&apos;t on the guest list anymore. Ask the host for a new one.
            </p>
          )}
          <RsvpForm
            slug={event.slug}
            token={guest?.token ?? null}
            guest={
              guest
                ? {
                    name: guest.name,
                    status: guest.rsvp_status,
                    partySize: guest.party_size,
                    note: guest.rsvp_note,
                  }
                : null
            }
            openRsvp={event.open_rsvp}
            maxPartySize={event.max_party_size}
            passed={eventHasPassed(event, yesterday)}
          />
        </EventInvitation>
      </main>

      <PoweredByFooter />
    </div>
  );
}
