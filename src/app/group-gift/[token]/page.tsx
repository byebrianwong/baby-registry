import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { GroupGiftPage } from "@/components/group-gift-page";
import { GroupGiftSurprise } from "@/components/group-gift-surprise";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer } from "@/lib/viewer";
import { readEventGuestCookie } from "@/lib/event-guest-cookie";
import { groupGiftUrl, isGroupGiftToken } from "@/lib/group-gifts";
import {
  groupGiftViewFor,
  loadGroupGift,
  managesGroupGiftList,
  rememberedPledgeToken,
} from "@/lib/group-gifts-server";

// A group gift's page, by the secret token in the link its organizer shares
// (src/lib/group-gifts.ts). Read with the service-role client, filtered by
// that token. It's never in search results.

export const metadata: Metadata = {
  title: "Group gift | Regibee",
  robots: { index: false, follow: false },
};

/** Name and email for the pledge form: from the account, or an event invitation. */
async function prefillFor(
  viewer: Awaited<ReturnType<typeof getViewer>>,
  eventId: string | null,
): Promise<{ name: string; email: string | null } | null> {
  if (viewer) {
    const { data } = await supabaseAdmin.from("profiles").select("full_name").eq("id", viewer.id).maybeSingle();
    const name = (data?.full_name as string | null)?.trim() || "";
    return { name, email: viewer.email ?? null };
  }
  try {
    const guest = await readEventGuestCookie();
    if (guest && eventId && guest.eventId === eventId) return { name: guest.name, email: guest.email };
  } catch {
    // An unreadable cookie only means no prefill.
  }
  return null;
}

export default async function GroupGiftRoute({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const [{ token }, { p }] = await Promise.all([params, searchParams]);
  if (!isGroupGiftToken(token)) notFound();
  const [loaded, viewer] = await Promise.all([loadGroupGift(token), getViewer()]);
  if (!loaded) notFound();

  // The list's owner and managers never see the pledges: it's their surprise.
  const managesList = viewer ? await managesGroupGiftList(viewer.id, loaded.gift) : false;

  const header = (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3">
        <Link href={viewer ? "/dashboard" : "/"} className="inline-flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
      </div>
    </header>
  );

  if (managesList) {
    return (
      <div className="min-h-screen bg-primary">
        {header}
        <main className="container mx-auto px-4 py-8 sm:py-12">
          <GroupGiftSurprise listSlug={loaded.registry.slug} />
        </main>
      </div>
    );
  }

  const [pledgeToken, prefill] = await Promise.all([
    isGroupGiftToken(p) ? Promise.resolve(p) : rememberedPledgeToken(loaded.gift.token),
    prefillFor(viewer, loaded.gift.event_id),
  ]);
  const { view, viewer: pageViewer } = groupGiftViewFor(loaded, {
    viewerId: viewer?.id ?? null,
    pledgeToken,
    prefill,
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-primary">
      {header}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <GroupGiftPage view={view} viewer={pageViewer} shareUrl={groupGiftUrl(siteUrl, loaded.gift.token)} />
      </main>
      <footer className="mt-8 border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-tertiary">
          Powered by{" "}
          <a href="/" className="font-medium text-brand-600 hover:underline">
            Regibee
          </a>
          . Regibee never holds the money: everyone pays the organizer back directly.
        </div>
      </footer>
    </div>
  );
}
