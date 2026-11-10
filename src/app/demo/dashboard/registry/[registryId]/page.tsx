import { DemoManageRegistry } from "../../../_components/demo-manage-registry";

export default async function DemoRegistryManagePage({ params }: { params: Promise<{ registryId: string }> }) {
  const { registryId } = await params;
  return <DemoManageRegistry registryId={registryId} />;
}
