import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/event-form";
import {
  getEventForManager,
  getEventRegistries,
  getGiftExchange,
  getManageableRegistries,
} from "@/lib/events-server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Edit event | Regibee" };

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { eventId } = await params;
  const found = await getEventForManager(eventId, viewer.id);
  if (!found) notFound();
  const { event } = found;

  const [registries, linked, exchange] = await Promise.all([
    getManageableRegistries(viewer.id),
    getEventRegistries(event.id),
    getGiftExchange(event.id),
  ]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/dashboard/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary max-sm:min-h-11"
      >
        <ArrowLeft className="size-4" />
        {event.title}
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Edit event</h1>
      <p className="mt-1 text-tertiary">Guests see your changes on the event page right away.</p>
      <div className="mt-6">
        <EventForm
          eventId={event.id}
          initial={event}
          registries={registries}
          linkedRegistries={linked.map((r) => ({ id: r.id, title: r.title, honoree: r.honoree }))}
          exchange={exchange}
        />
      </div>
    </div>
  );
}
