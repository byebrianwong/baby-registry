import type { Metadata } from "next";
import { DemoGroupGift } from "../../_components/demo-group-gift";

export const metadata: Metadata = { title: "Demo group gift | Regibee", robots: { index: false, follow: false } };

/** A demo group gift. `?as=organizer` shows it as the person who started it. */
export default async function DemoGroupGiftRoute({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ as?: string }>;
}) {
  const [{ token }, { as }] = await Promise.all([params, searchParams]);
  return <DemoGroupGift token={token} as={as === "organizer" ? "organizer" : "visitor"} />;
}
