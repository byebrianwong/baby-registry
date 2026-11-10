import { notFound } from "next/navigation";
import { DemoChecklist } from "../../../../_components/demo-checklist";

// Only baby registries have the checklist.
export default async function DemoChecklistPage({ params }: { params: Promise<{ registryId: string }> }) {
  const { registryId } = await params;
  if (registryId !== "baby") notFound();
  return <DemoChecklist />;
}
