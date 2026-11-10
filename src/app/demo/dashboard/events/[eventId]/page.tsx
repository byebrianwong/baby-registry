import { DemoEventHost } from "../../../_components/demo-event-host";

export default async function DemoEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <DemoEventHost eventId={eventId} />;
}
