import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyBuyerLink } from "@/lib/buyer-link";
import type { PaymentMethods, RegistrySettings } from "@/lib/types";
import type { Metadata } from "next";
import { ScrollToTop } from "@/components/scroll-to-top";
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
  isExpiredReservation,
  isGiftLinkStep,
  isOpenReservation,
  toMyItemGift,
  type MyItemGift,
} from "@/lib/gifts";
import type { OpenGift } from "@/components/reserve-item-dialog";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("title, description, is_public")
    .eq("slug", slug)
    .single();

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
  const [{ data: registry }, viewer] = await Promise.all([
    supabaseAdmin.from("registries").select("*").eq("slug", slug).single(),
    // Only used for where the logo goes. Cached, so the follow check below
    // reuses it.
    getViewer(),
  ]);

  if (!registry) {
    notFound();
  }

  // Only registries the owner chose to show on their profile say who owns them,
  // so unlisted ones never point to a profile.
  let owner: { publicId: string; path: string; name: string } | null = null;
  let ownerRelation: Awaited<ReturnType<typeof getViewerRelation>> | null = null;
  if (registry.listed_on_profile) {
    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, public_id, full_name")
      .eq("id", registry.owner_id)
      .single();
    if (ownerProfile) {
      ownerRelation = await getViewerRelation(ownerProfile.id);
      if (!ownerRelation.hidden) {
        owner = {
          publicId: ownerProfile.public_id,
          path: profilePath(ownerProfile),
          name: displayName(ownerProfile),
        };
      }
    }
  }

  const [{ data: categories }, { data: items }, { data: cashFunds }] =
    await Promise.all([
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
    ]);

  const allItems = (items || []) as RegistryItem[];
  const allCategories = (categories || []) as Category[];
  const allFunds = (cashFunds || []) as CashFund[];
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

  // Check which parent-purchased items have been covered and how many times
  const parentPurchasedIds = allItems.filter((i) => i.is_parent_purchased).map((i) => i.id);
  const coverCounts = new Map<string, number>();
  if (parentPurchasedIds.length > 0) {
    const { data: coverPurchases } = await supabaseAdmin
      .from("purchases")
      .select("registry_item_id, quantity")
      .in("registry_item_id", parentPurchasedIds)
      .neq("status", "cancelled");
    for (const p of coverPurchases || []) {
      if (p.registry_item_id) {
        coverCounts.set(p.registry_item_id, (coverCounts.get(p.registry_item_id) || 0) + (p.quantity || 1));
      }
    }
  }

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
  let hasReservation = false;
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
  if (claimedItemByPurchase.size > 0) {
    const { data: claimedPurchases } = await supabaseAdmin
      .from("purchases")
      .select("id, registry_item_id, status, reserved_until, quantity")
      .in("id", [...claimedItemByPurchase.keys()])
      .neq("status", "cancelled");
    for (const p of claimedPurchases || []) {
      if (p.registry_item_id && claimedItemByPurchase.get(p.id) === p.registry_item_id) {
        if (reservableItemIds.has(p.registry_item_id)) hasReservation = true;
        myItemGifts[p.registry_item_id] = toMyItemGift(p);
      }
    }
  }

  // If the visitor arrived via a signed buyer link, look up their purchases
  // for this specific registry and merge with cookie-based highlights.
  if (buyerEmail && sig) {
    try {
      if (verifyBuyerLink(buyerEmail, slug, sig)) {
        const itemIds = allItems.map((i) => i.id);
        const fundIds = allFunds.map((f) => f.id);

        const queries = [];
        if (itemIds.length > 0) {
          queries.push(
            supabaseAdmin
              .from("purchases")
              .select("id, registry_item_id, cash_fund_id, amount, status, reserved_until, quantity")
              .eq("buyer_email", buyerEmail.toLowerCase())
              .neq("status", "cancelled")
              .in("registry_item_id", itemIds)
          );
        }
        if (fundIds.length > 0) {
          queries.push(
            supabaseAdmin
              .from("purchases")
              .select("id, registry_item_id, cash_fund_id, amount, status, reserved_until, quantity")
              .eq("buyer_email", buyerEmail.toLowerCase())
              .neq("status", "cancelled")
              .in("cash_fund_id", fundIds)
          );
        }

        const results = await Promise.all(queries);
        const allPurchases = results.flatMap((r) => r.data || []);

        for (const p of allPurchases) {
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
      }
    } catch {
      // Invalid signature — ignore silently
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
  const reservableIds = [...reservableItemIds];
  if (reservableIds.length > 0) {
    const { data: openReservations } = await supabaseAdmin
      .from("purchases")
      .select("id, registry_item_id, quantity, status, reserved_until")
      .in("registry_item_id", reservableIds)
      .eq("status", "reserved")
      .not("reserved_until", "is", null);
    const now = Date.now();
    for (const p of openReservations || []) {
      if (!p.registry_item_id || !isOpenReservation(p)) continue;
      const counts = isExpiredReservation(p, now) && !myPurchaseIds.has(p.id) ? expiredCounts : reservedCounts;
      counts[p.registry_item_id] = (counts[p.registry_item_id] || 0) + (p.quantity || 1);
    }
  }
  const shownItems = allItems.map((i) =>
    expiredCounts[i.id]
      ? { ...i, quantity_fulfilled: Math.max(0, i.quantity_fulfilled - expiredCounts[i.id]) }
      : i
  );

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

      {/* Items */}
      <main className="container mx-auto px-4 py-8">
        {totalItems === 0 && allFunds.length === 0 ? (
          <div className="text-center py-16 text-tertiary">
            <p>This registry doesn&apos;t have any items yet.</p>
          </div>
        ) : (
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
        )}
      </main>

      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-tertiary">
          Powered by{" "}
          <a href="/" className="font-medium text-brand-600 hover:underline">
            Regibee
          </a>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
