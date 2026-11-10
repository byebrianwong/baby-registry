import type { Metadata } from "next";
import { DemoPublicRegistry } from "../../_components/demo-public-registry";

export const metadata: Metadata = { title: "Demo registry | Regibee", robots: { index: false, follow: false } };

export default async function DemoRegistryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DemoPublicRegistry slug={slug} />;
}
