import { DemoRegistrySettings } from "../../../../_components/demo-registry-settings";

export default async function DemoRegistrySettingsPage({ params }: { params: Promise<{ registryId: string }> }) {
  const { registryId } = await params;
  return <DemoRegistrySettings registryId={registryId} />;
}
