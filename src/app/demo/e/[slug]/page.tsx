import type { Metadata } from "next";
import { DemoPublicEvent } from "../../_components/demo-public-event";

export const metadata: Metadata = { title: "Demo event | Regibee", robots: { index: false, follow: false } };

export default async function DemoEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ g?: string }>;
}) {
  const [{ slug }, { g }] = await Promise.all([params, searchParams]);
  return <DemoPublicEvent slug={slug} token={g ?? null} />;
}
