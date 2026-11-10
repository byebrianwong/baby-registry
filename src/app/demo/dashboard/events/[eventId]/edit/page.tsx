import { DemoEventForm } from "../../../../_components/demo-event-form";

export default async function DemoEditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <DemoEventForm eventId={eventId} />;
}
