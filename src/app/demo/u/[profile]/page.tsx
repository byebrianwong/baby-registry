import type { Metadata } from "next";
import { DemoProfile } from "../../_components/demo-profile";

export const metadata: Metadata = { title: "Demo profile | Regibee", robots: { index: false, follow: false } };

export default async function DemoProfilePage({ params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params;
  return <DemoProfile segment={profile} />;
}
