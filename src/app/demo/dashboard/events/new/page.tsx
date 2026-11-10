import { DemoEventForm } from "../../../_components/demo-event-form";

// "Plan an event" on a registry's page links here with that registry.
export default async function DemoNewEventPage({ searchParams }: { searchParams: Promise<{ registry?: string }> }) {
  const { registry } = await searchParams;
  return <DemoEventForm registryId={registry} />;
}
