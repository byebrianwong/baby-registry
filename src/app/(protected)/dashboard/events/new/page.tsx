import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/event-form";
import { getManageableRegistries } from "@/lib/events-server";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "New event | Regibee" };

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ registry?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { registry } = await searchParams;
  const registries = await getManageableRegistries(viewer.id);
  // "Plan an event" on a registry's page links here with that registry.
  const linked = registries.find((r) => r.id === registry)?.id ?? null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Events
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Plan an event</h1>
      <p className="mt-1 text-tertiary">
        Add the details now. You&apos;ll add guests and send the invitation next.
      </p>
      <div className="mt-6">
        <EventForm registries={registries} initial={{ registry_id: linked }} />
      </div>
    </div>
  );
}
