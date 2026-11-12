"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { EventForm } from "@/components/event-form";
import { findDemoEvent } from "@/lib/demo-events";
import { demoOwnRegistries } from "@/lib/demo-registries";
import { useDemoToday } from "../demo-today";
import { DemoOwnerShell } from "./demo-shell";
import { DEMO_NOT_SAVED } from "./demo-event-host";

const notSaved = async () => ({ error: DEMO_NOT_SAVED });

/** The event form's registry link lookup, against the demo's own registries. */
function demoLookup(today: string) {
  return async (link: string) => {
    const slug = link.trim().match(/r\/([a-z0-9-]+)/i)?.[1] ?? link.trim();
    const found = demoOwnRegistries(today).find((r) => r.slug === slug);
    return found
      ? { error: null, registry: { id: found.id, title: found.title, honoree: found.honoree_names ?? null } }
      : { error: "In the demo, paste the link to a demo registry, like /demo/r/remi-and-max." };
  };
}

function DemoNotice() {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-sunshine-50 p-4 text-sm text-sunshine-900">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      Fill it in to see how it works. The demo doesn&apos;t save events, so Save stops with a note.
    </p>
  );
}

/**
 * The event form, new or editing a demo event. Like the pages in
 * src/app/(protected)/dashboard/events/new and [eventId]/edit.
 */
export function DemoEventForm({ eventId, registryId }: { eventId?: string; registryId?: string }) {
  const today = useDemoToday();
  const event = eventId ? findDemoEvent(today, { id: eventId }) : null;
  if (eventId && !event) notFound();
  const registries = demoOwnRegistries(today).map((r) => ({ id: r.id, title: r.title }));

  return (
    <DemoOwnerShell>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Link
          href={event ? `/demo/dashboard/events/${event.id}` : "/demo/dashboard/events"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {event ? event.title : "Events"}
        </Link>
        <h1 className="mt-4 text-3xl font-bold">{event ? "Edit event" : "Plan an event"}</h1>
        <p className="mt-1 text-tertiary">
          {event
            ? "Guests see your changes on the event page right away."
            : "Add the details now. You'll add guests and send the invitation next."}
        </p>
        <DemoNotice />
        <div className="mt-6">
          {event ? (
            <EventForm
              eventId={event.id}
              initial={event}
              registries={registries}
              startRegistryId={event.registryId}
              lookupAction={demoLookup(today)}
              updateAction={notSaved}
              setImageAction={notSaved}
              uploadImage={notSaved}
            />
          ) : (
            <EventForm
              registries={registries}
              startRegistryId={registries.find((r) => r.id === registryId)?.id ?? null}
              lookupAction={demoLookup(today)}
              createAction={notSaved}
              setImageAction={notSaved}
              uploadImage={notSaved}
            />
          )}
        </div>
      </div>
    </DemoOwnerShell>
  );
}
