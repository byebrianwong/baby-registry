import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Gift } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { readEventGuestCookie } from "@/lib/event-guest-cookie";
import { isUuid } from "@/lib/extension";
import { verifyBuyerLink } from "@/lib/buyer-link";
import type { PaymentMethods, RegistrySettings } from "@/lib/types";
import type { Metadata } from "next";
import { ScrollToTop } from "@/components/scroll-to-top";
import { PoweredByFooter } from "@/components/site-footer";
import { SuggestItemDialog } from "@/components/suggest-item-dialog";
import { PublicRegistryGrid } from "@/components/public-registry-grid";
import { PublicRegistryHero } from "@/components/public-registry-hero";
import { copyForRegistry, honoreeDisplayName } from "@/lib/registry-copy";
import { FollowButton } from "@/components/follow-button";
import { displayName, profilePath } from "@/lib/profile-link";
import { getViewer, getViewerRelation } from "@/lib/viewer";
import type { RegistryType } from "@/lib/types";
import { Logo } from "@/components/logo";
import { parseRetailerRegistries, type StoreId } from "@/lib/retailers";
import {
  SECRET_GIVER_NAME,
  fundAsUnpledged,
  isExpiredReservation,
  isGiftLinkStep,
  isOpenReservation,
  itemAsUnreserved,
  readReservationPrivacy,
  reservationsHiddenFrom,
  toMyItemGift,
  type MyItemGift,
} from "@/lib/gifts";
import { ReservationsHiddenNotice } from "@/components/reservations-hidden-notice";
import type { OpenGift } from "@/components/reserve-item-dialog";
import { GuestPrefillProvider, type GuestPrefill } from "@/components/guest-prefill-context";

const PURCHASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface RegistryItem {
  id: string;
  title: string;
  external_url: string | null;
  image_url: string | null;
  price: number | null;
  quantity_needed: number;
  quantity_fulfilled: number;
  is_essential: boolean;
  is_parent_purchased: boolean;
  is_open_to_used: boolean;
  minimum_condition: string | null;
  notes: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface CashFund {
  id: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  current_amount: number;
}

// The page and its metadata both need the registry, so it's read once per
// request.
const getRegistry = cache(async (slug: string) => {
  const { data } = await supabaseAdmin.from("registries").select("*").eq("slug", slug).single();
  return data;
});

// Who shared the registry and how the viewer relates to them. The owner stays
// hidden from a viewer they've blocked.
async function loadOwner(listedOnProfile: boolean, ownerId: string) {
  if (!listedOnProfile) return { owner: null, ownerRelation: null };
  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, public_id, full_name")
    .eq("id", ownerId)
    .single();
  if (!ownerProfile) return { owner: null, ownerRelation: null };
  const ownerRelation = await getViewerRelation(ownerProfile.id);
  if (ownerRelation.hidden) return { owner: null, ownerRelation };
  return {
    owner: {
      publicId: ownerProfile.public_id as string,
      path: profilePath(ownerProfile),
      name: displayName(ownerProfile),
    },
    ownerRelation,
  };
}

// A guest who came from a gift link on their event invitation (the event
// guest cookie). When their event links this registry, or they're the Secret
// Santa of its owner, the gift forms start with their name and email. A
// Secret Santa also sees a notice that the owners won't see their name.
async function loadGuestPrefill(
  registryId: string
): Promise<{ prefill: GuestPrefill | null; santaFor: string | null }> {
  const none = { prefill: null, santaFor: null };
  try {
    const guest = await readEventGuestCookie();
    if (!guest) return none;
    const isSanta = guest.santa?.registryId === registryId;
    if (!isSanta) {
      if (!isUuid(guest.eventId)) return none;
      const { data: link } = await supabaseAdmin
        .from("event_registries")
        .select("event_id")
        .eq("event_id", guest.eventId)
        .eq("registry_id", registryId)
        .maybeSingle();
      if (!link) return none;
    }
    return {
      prefill: { name: guest.name, email: guest.email, secretGiver: isSanta },
      santaFor: isSanta ? guest.santa?.gifteeName || null : null,
    };
  } catch (err) {
    console.error("[registry] Failed to read the event guest cookie:", err);
    return none;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const registry = await getRegistry(slug);

  if (!registry) return { title: "Registry Not Found" };

  return {
    title: `${registry.title} | Regibee`,
    description: registry.description || `View and shop ${registry.title}`,
    ...(!registry.is_public && { robots: { index: false, follow: false } }),
  };
}

export default async function PublicRegistryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string; sig?: string; gift?: string; step?: string }>;
}) {
  const { slug } = await params;
  const { email: buyerEmail, sig, gift: giftParam, step: stepParam } = await searchParams;

  // Registry data is read with the service-role client, always filtered by the
  // slug in the URL. Anonymous database clients have no read access to these
  // tables (see supabase/migrations/009_restrict_registry_reads.sql), so the
  // full list of registries can't be pulled with the public anon key.
  const [registry, viewer] = await Promise.all([
    getRegistry(slug),
    // Only used for where the logo goes. Cached, so the follow check below
    // reuses it.
    getViewer(),
  ]);

  if (!registry) {
    notFound();
  }

  // Only registries the owner chose to show on their profile say who owns them,
  // so unlisted ones never point to a profile. The owner lookups don't depend
  // on the items, so both run at the same time.
  const [
    { owner, ownerRelation },
    { data: categories },
    { data: items },
    { data: cashFunds },
    { prefill: guestPrefill, santaFor },
  ] = await Promise.all([
    loadOwner(Boolean(registry.listed_on_profile), registry.owner_id),
    supabaseAdmin
      .from("categories")
      .select("*")
      .eq("registry_id", registry.id)
      .order("sort_order"),
    supabaseAdmin
      .from("registry_items")
      .select("*")
      .eq("registry_id", registry.id)
      .order("sort_order"),
    supabaseAdmin
      .from("cash_funds")
      .select("*")
      .eq("registry_id", registry.id),
    loadGuestPrefill(registry.id),
  ]);

  // The owner can hide what's been reserved from themselves (src/lib/gifts.ts).
  // When they open their own list's page, it shows nothing reserved, the same
  // as their dashboard. Everyone else sees what's taken.
  const hideReservations = reservationsHiddenFrom(registry, viewer?.id);

  const allItems = (items || []) as RegistryItem[];
  const allCategories = (categories || []) as Category[];
  const allFunds = ((cashFunds || []) as CashFund[]).map((fund) =>
    hideReservations ? fundAsUnpledged(fund) : fund
  );
  const parentName = honoreeDisplayName(registry);
  const copy = copyForRegistry(registry);
  const registryType = (registry.registry_type as RegistryType | undefined) || "baby";
  const isBabyRegistry = registryType === "baby";

  const paymentMethods = (registry.settings as any)?.payment_methods as
    | PaymentMethods
    | undefined;

  // Only the store ids go to the browser. The owner's store registry links
  // stay on the server.
  const linkedStores: StoreId[] = isBabyRegistry
    ? parseRetailerRegistries(registry.settings).map((r) => r.store)
    : [];

  // Read guest purchase cookie
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get("regibee_my_gifts")?.value;
  let myGifts: { items?: Record<string, string>; funds?: Record<string, number> } = {};
  try {
    if (rawCookie) myGifts = JSON.parse(rawCookie);
  } catch {}

  // The shipping address is only shown by the reserve dialog, after a guest
  // reserves a regular item, so it's only sent to visitors we can tie to a live
  // reservation here. The gifts cookie is readable and editable in the browser,
  // so it counts only when it holds the purchase id of that reservation; item
  // ids are public, purchase ids aren't. A verified buyer link also counts.
  const reservableItemIds = new Set(
    allItems.filter((i) => !i.is_parent_purchased).map((i) => i.id)
  );
  const allItemIds = new Set(allItems.map((i) => i.id));
  // This visitor's own gifts, by item id. Covers of items the owners bought
  // are here too, so the guest can see and undo them, but they never reveal
  // the address: nothing ships.
  const myItemGifts: Record<string, MyItemGift> = {};

  const claimedItemByPurchase = new Map<string, string>();
  for (const [itemId, purchaseId] of Object.entries(myGifts.items ?? {})) {
    if (
      allItemIds.has(itemId) &&
      typeof purchaseId === "string" &&
      PURCHASE_ID_PATTERN.test(purchaseId)
    ) {
      claimedItemByPurchase.set(purchaseId, itemId);
    }
  }

  // A visitor who arrived via a signed buyer link sees their purchases for
  // this registry highlighted, along with the ones in their cookie.
  let isVerifiedBuyer = false;
  if (buyerEmail && sig) {
    try {
      isVerifiedBuyer = verifyBuyerLink(buyerEmail, slug, sig);
    } catch {
      // Invalid signature — ignore silently
    }
  }

  type PurchaseRow = {
    id: string;
    registry_item_id: string | null;
    cash_fund_id?: string | null;
    quantity?: number | null;
    amount?: number | string | null;
    status: string;
    reserved_until?: string | null;
  };
  type CoverRow = { registry_item_id: string | null; quantity: number | null };
  const noRows = Promise.resolve({ data: [] as PurchaseRow[] });
  const buyerPurchases = (column: "registry_item_id" | "cash_fund_id", ids: string[]) =>
    isVerifiedBuyer && ids.length > 0
      ? supabaseAdmin
          .from("purchases")
          .select("id, registry_item_id, cash_fund_id, amount, status, reserved_until, quantity")
          .eq("buyer_email", buyerEmail!.toLowerCase())
          .neq("status", "cancelled")
          .in(column, ids)
      : noRows;

  // These lookups only need the items, so they run at the same time.
  const parentPurchasedIds = allItems.filter((i) => i.is_parent_purchased).map((i) => i.id);
  const reservableIds = [...reservableItemIds];
  const [
    { data: coverPurchases },
    { data: claimedPurchases },
    { data: buyerItemPurchases },
    { data: buyerFundPurchases },
    { data: openReservations },
  ] = await Promise.all([
    // How many times each parent-purchased item has been covered
    parentPurchasedIds.length > 0
      ? supabaseAdmin
          .from("purchases")
          .select("registry_item_id, quantity")
          .in("registry_item_id", parentPurchasedIds)
          .neq("status", "cancelled")
      : noRows,
    claimedItemByPurchase.size > 0
      ? supabaseAdmin
          .from("purchases")
          .select("id, registry_item_id, status, reserved_until, quantity")
          .in("id", [...claimedItemByPurchase.keys()])
          .neq("status", "cancelled")
      : noRows,
    buyerPurchases("registry_item_id", allItems.map((i) => i.id)),
    buyerPurchases("cash_fund_id", allFunds.map((f) => f.id)),
    // Reservations still on hold, for the counts below
    reservableIds.length > 0
      ? supabaseAdmin
          .from("purchases")
          .select("id, registry_item_id, quantity, status, reserved_until")
          .in("registry_item_id", reservableIds)
          .eq("status", "reserved")
          .not("reserved_until", "is", null)
      : noRows,
  ]);

  const coverCounts = new Map<string, number>();
  for (const p of (coverPurchases || []) as CoverRow[]) {
    if (p.registry_item_id) {
      coverCounts.set(p.registry_item_id, (coverCounts.get(p.registry_item_id) || 0) + (p.quantity || 1));
    }
  }

  let hasReservation = false;
  for (const p of (claimedPurchases || []) as PurchaseRow[]) {
    if (p.registry_item_id && claimedItemByPurchase.get(p.id) === p.registry_item_id) {
      if (reservableItemIds.has(p.registry_item_id)) hasReservation = true;
      myItemGifts[p.registry_item_id] = toMyItemGift(p);
    }
  }

  for (const p of [...(buyerItemPurchases || []), ...(buyerFundPurchases || [])] as PurchaseRow[]) {
    if (p.registry_item_id) {
      if (!myGifts.items) myGifts.items = {};
      myGifts.items[p.registry_item_id] = "reserved";
      if (reservableItemIds.has(p.registry_item_id)) hasReservation = true;
      // The signed link proves this visitor is the buyer, so their
      // purchase ids can go to the page for them to finish or release.
      if (!myItemGifts[p.registry_item_id]) myItemGifts[p.registry_item_id] = toMyItemGift(p);
    }
    if (p.cash_fund_id && p.amount) {
      if (!myGifts.funds) myGifts.funds = {};
      myGifts.funds[p.cash_fund_id] = (myGifts.funds[p.cash_fund_id] || 0) + Number(p.amount);
    }
  }

  // How many of each item are only reserved so far, not bought, so other
  // guests see "Reserved by a guest" rather than "Gifted". A reservation that
  // ran out stays in the database until the daily job releases it, so until
  // then it's taken off the item's count here, and reserving the item
  // releases it (reserveItem). Its own guest still sees it as theirs, so they
  // can say they bought it.
  const reservedCounts: Record<string, number> = {};
  const expiredCounts: Record<string, number> = {};
  const myPurchaseIds = new Set(Object.values(myItemGifts).map((g) => g.purchaseId));
  const now = Date.now();
  for (const p of (openReservations || []) as PurchaseRow[]) {
    if (!p.registry_item_id || !isOpenReservation(p)) continue;
    const counts = isExpiredReservation(p, now) && !myPurchaseIds.has(p.id) ? expiredCounts : reservedCounts;
    counts[p.registry_item_id] = (counts[p.registry_item_id] || 0) + (p.quantity || 1);
  }
  const shownItems = allItems.map((i) =>
    hideReservations
      ? itemAsUnreserved(i)
      : expiredCounts[i.id]
        ? { ...i, quantity_fulfilled: Math.max(0, i.quantity_fulfilled - expiredCounts[i.id]) }
        : i
  );
  if (hideReservations) {
    for (const id of Object.keys(reservedCounts)) delete reservedCounts[id];
    coverCounts.clear();
  }

  // A link from a guest's email opens the gift dialog at a step. The link
  // route has already put the gift in this browser's cookie.
  const openGift: OpenGift | undefined =
    giftParam && allItemIds.has(giftParam) && (isGiftLinkStep(stepParam) || stepParam === "ended")
      ? { itemId: giftParam, step: stepParam }
      : undefined;

  const shippingAddress = hasReservation
    ? (registry.settings as RegistrySettings | null)?.shipping_address
    : undefined;

  const totalItems = shownItems.length;
  const fulfilledItems = shownItems.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;

  const coverCountsObj: Record<string, number> = {};
  for (const [k, v] of coverCounts) coverCountsObj[k] = v;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          {/* Like the shared top bar: signed-in people go to their
              registries, everyone else to the home page. */}
          <Link href={viewer ? "/dashboard" : "/"} className="inline-flex items-center gap-2 font-semibold">
            <Logo />
          </Link>
        </div>
      </header>

      <PublicRegistryHero
        isBabyRegistry={isBabyRegistry}
        title={registry.title}
        photoUrl={registry.photo_url}
        names={registry.honoree_names || registry.parent_names}
        eventDate={registry.event_date}
        description={registry.description}
        fulfilledItems={fulfilledItems}
        totalItems={totalItems}
        owner={owner && ownerRelation ? owner : null}
        followButton={
          owner &&
          ownerRelation &&
          !ownerRelation.isOwner && (
            <FollowButton
              publicId={owner.publicId}
              name={owner.name}
              state={ownerRelation.state}
              returnTo={`/r/${slug}`}
            />
          )
        }
      />

      {/* Items. With no items or funds yet, the grid says so and still offers
          "Suggest an item". */}
      <main className="container mx-auto px-4 py-8">
        {hideReservations && (
          <ReservationsHiddenNotice
            className="mb-6"
            settingsHref={`/dashboard/registry/${registry.id}/settings`}
            turnedOnByExchange={readReservationPrivacy(registry.settings).hide_reservations_source === "exchange"}
          />
        )}
        {santaFor && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sunshine-200 bg-sunshine-50 p-4">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-primary">You&apos;re {santaFor}&apos;s Secret Santa.</p>
              <p className="text-sm text-secondary">
                If you reserve a gift here, {santaFor} sees &ldquo;{SECRET_GIVER_NAME}&rdquo; instead of your
                name.
              </p>
            </div>
          </div>
        )}
        <GuestPrefillProvider value={guestPrefill}>
          <PublicRegistryGrid
            items={shownItems}
            categories={allCategories}
            cashFunds={allFunds}
            parentName={parentName}
            paymentMethods={paymentMethods}
            shippingAddress={shippingAddress}
            myGifts={myGifts}
            myItemGifts={myItemGifts}
            reservedCounts={reservedCounts}
            openGift={openGift}
            coverCounts={coverCountsObj}
            selfPurchasedLabel={copy.selfPurchasedLabel}
            coverFlavor={copy.coverItemFlavor(parentName)}
            linkedStores={linkedStores}
            showStoreRegistries={isBabyRegistry}
            suggestButton={
              <SuggestItemDialog
                registryId={registry.id}
                categories={allCategories.map((c) => ({ id: c.id, name: c.name }))}
              />
            }
          />
        </GuestPrefillProvider>
      </main>

      <PoweredByFooter />

      <ScrollToTop />
    </div>
  );
}
