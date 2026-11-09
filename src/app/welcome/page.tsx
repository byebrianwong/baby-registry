import { redirect } from "next/navigation";

// Sign-up used to stop here to choose a username. Confirmation emails sent
// before that was removed still link here, so this passes them on to where
// they were going (?next=).

// Only paths on this site, so a crafted link can't send people elsewhere.
function safeNext(raw: string | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  redirect(safeNext((await searchParams).next));
}
