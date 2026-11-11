import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { GroupManager } from "@/components/group-manager";
import {
  getGroupForOwner,
  getGroupMembers,
  listGroupEvents,
  listGroupRegistries,
} from "@/lib/groups-server";
import { getEventForManager } from "@/lib/events-server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Group | Regibee" };

/** A group's page. Only its owner can open it. */
export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { groupId } = await params;
  const group = await getGroupForOwner(groupId, viewer.id);
  if (!group) notFound();

  const [members, groupEvents, sharedLists] = await Promise.all([
    getGroupMembers(group.id),
    listGroupEvents(group.id),
    listGroupRegistries(group.id),
  ]);
  // Only events this person still hosts. A co-host who was removed doesn't
  // keep seeing the event here.
  const hosted = await Promise.all(groupEvents.map((e) => getEventForManager(e.id, viewer.id)));
  const events = groupEvents.filter((_, index) => hosted[index] !== null);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary max-sm:min-h-11"
      >
        <ArrowLeft className="size-4" />
        Events and groups
      </Link>
      <div className="mt-4">
        <GroupManager
          group={{ id: group.id, name: group.name }}
          members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
          events={events}
          sharedLists={sharedLists}
        />
      </div>
    </div>
  );
}
