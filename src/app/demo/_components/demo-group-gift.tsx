"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { GroupGiftPage, type GroupGiftPageActions } from "@/components/group-gift-page";
import { findDemoEvent } from "@/lib/demo-events";
import { demoGroupGiftPage, findDemoGroupGift } from "@/lib/demo-group-gifts";
import { DEMO_ME } from "@/lib/demo-people";
import { findDemoRegistry } from "@/lib/demo-registries";
import { looksLikeEmail } from "@/lib/email-address";
import { groupGiftPath, type GroupGiftView, type GroupGiftViewer } from "@/lib/group-gifts";
import { honoreeDisplayName } from "@/lib/registry-copy";
import { useDemoToday } from "../demo-today";
import { DemoGuestShell } from "./demo-shell";
import { DemoGuestHeader } from "./demo-guest-header";
import { parseStartedGroupGiftToken, startedGroupGift } from "./demo-started-group-gifts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Who the page shows it to: someone who opened the link, or the person who started it. */
export type DemoGroupGiftRole = "visitor" | "organizer";

const ok = async () => ({ success: true as const });

/**
 * Stand-ins for the page's server actions. GroupGiftPage shows each change
 * itself, so these only check what the real ones check, then succeed.
 */
function demoActions(signedIn: boolean): GroupGiftPageActions {
  return {
    pledge: async (input) => {
      // Like pledgeToGroupGift: without an account, a pledger gives an email
      // so they can change their pledge later.
      if (!signedIn && !looksLikeEmail(input.email?.trim() ?? "")) {
        return { error: "Add your email, so you can change this later." };
      }
      if (!input.name?.trim()) return { error: "Add your name." };
      return { success: true, pledgeToken: "demo-pledge" };
    },
    change: ok,
    withdraw: ok,
    setPaid: ok,
    markBought: ok,
    callOff: ok,
  };
}

interface DemoGroupGiftData {
  view: GroupGiftView;
  viewer: GroupGiftViewer;
  /** Says whose eyes the page shows it through, with a link to the other view. */
  note: React.ReactNode;
}

/** The stroller's group gift, or another from src/lib/demo-group-gifts.ts. */
function sampleGroupGift(today: string, token: string, as: DemoGroupGiftRole): DemoGroupGiftData | null {
  const gift = findDemoGroupGift(token);
  const registry = gift ? findDemoRegistry(today, { id: gift.registryId }) : null;
  if (!gift || !registry) return null;
  const event = gift.eventId ? findDemoEvent(today, { id: gift.eventId }) : null;
  const organizer = gift.organizer.full_name.split(" ")[0];
  const path = groupGiftPath(gift.token, "/demo");
  return {
    ...demoGroupGiftPage(gift, registry, event ? { title: event.title, slug: event.slug } : null, as),
    note:
      as === "organizer" ? (
        <>
          You&apos;re {organizer}, who started this group gift, so you see what everyone pledged and can tick them
          off as they pay you back.{" "}
          <Link href={path} className="font-medium underline">
            See it as a guest
          </Link>
        </>
      ) : (
        <>
          You&apos;re a guest who opened {organizer}&apos;s link, without an account.{" "}
          <Link href={`${path}?as=organizer`} className="font-medium underline">
            See it as {organizer}, who started it
          </Link>
        </>
      ),
  };
}

/**
 * A group gift started from "Group gift" on a demo list. You're its organizer,
 * and nobody has chipped in yet. On Remi & Max's own lists you're a guest, as
 * on their registry pages; on friends' lists you're Remi & Max.
 */
function startedByVisitor(today: string, token: string): DemoGroupGiftData | null {
  const parsed = parseStartedGroupGiftToken(token);
  const registry = parsed ? findDemoRegistry(today, { id: parsed.registryId }) : null;
  const item = registry?.items.find((i) => i.id === parsed?.itemId);
  if (!registry || !item) return null;
  const ownList = registry.owner.public_id === DEMO_ME.public_id;
  const details = startedGroupGift(token) ?? { goalAmount: item.price, paybackNote: null };
  return {
    view: {
      token,
      status: "open",
      item: {
        title: item.title,
        imageUrl: item.image_url,
        url: item.external_url,
        price: item.price,
        onList: true,
      },
      recipientName: honoreeDisplayName({ honoree_names: registry.honoree_names, parent_names: null }, registry.title),
      listTitle: registry.title,
      listSlug: registry.slug,
      organizerName: ownList ? "You" : DEMO_ME.full_name,
      goalAmount: details.goalAmount,
      paybackNote: details.paybackNote,
      pledged: 0,
      pledges: [],
      event: null,
    },
    viewer: {
      role: "organizer",
      signedIn: true,
      myPledge: null,
      prefill: ownList ? null : { name: DEMO_ME.full_name, email: DEMO_ME.email },
    },
    note: "You started this group gift. Chip in your own share, or mark it bought. The demo doesn't save anything.",
  };
}

/**
 * A demo group gift's page. Like src/app/group-gift/[token]/page.tsx, with
 * sample data and stand-in actions: pledging, changing a pledge and ticking
 * people off as paid all happen on this page, and nothing is saved.
 */
export function DemoGroupGift({ token, as = "visitor" }: { token: string; as?: DemoGroupGiftRole }) {
  const today = useDemoToday();
  const data = sampleGroupGift(today, token, as) ?? startedByVisitor(today, token);
  if (!data) notFound();

  return (
    <DemoGuestShell>
      <DemoGuestHeader />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <p className="mx-auto mb-6 flex max-w-2xl items-start gap-2 rounded-xl bg-sunshine-50 p-4 text-sm text-sunshine-900">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{data.note}</span>
        </p>
        <GroupGiftPage
          // Switching between the guest's and the organizer's view starts the page over.
          key={`${token}:${data.viewer.role}`}
          view={data.view}
          viewer={data.viewer}
          shareUrl={`${SITE_URL}${groupGiftPath(token, "/demo")}`}
          actions={demoActions(data.viewer.signedIn)}
          basePath="/demo"
        />
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-tertiary">
          Regibee never holds the money: everyone pays the organizer back directly.
        </p>
      </main>
    </DemoGuestShell>
  );
}
