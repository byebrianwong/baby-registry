import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Calendar, LockOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyBuyerLink } from "@/lib/buyer-link";
import type { PaymentMethods, RegistrySettings } from "@/lib/types";
import type { Metadata } from "next";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SuggestItemDialog } from "@/components/suggest-item-dialog";
import { PublicRegistryGrid } from "@/components/public-registry-grid";
import { RegistryAvatar } from "@/components/registry-avatar";
import { copyForRegistry, honoreeDisplayName } from "@/lib/registry-copy";
import { FollowButton } from "@/components/follow-button";
import { displayName, profilePath } from "@/lib/profile-link";
import { getViewer, getViewerRelation } from "@/lib/viewer";
import type { RegistryType } from "@/lib/types";
import { Logo } from "@/components/logo";
import { parseRetailerRegistries, type StoreId } from "@/lib/retailers";

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
  searchParams: Promise<{ email?: string; sig?: string }>;
}) {
  const { slug } = await params;
  const { email: buyerEmail, sig } = await searchParams;

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
  const [{ owner, ownerRelation }, { data: categories }, { data: items }, { data: cashFunds }] =
    await Promise.all([
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

  const claimedItemByPurchase = new Map<string, string>();
  for (const [itemId, purchaseId] of Object.entries(myGifts.items ?? {})) {
    if (
      reservableItemIds.has(itemId) &&
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
    id?: string;
    registry_item_id: string | null;
    cash_fund_id?: string | null;
    quantity?: number | null;
    amount?: number | string | null;
  };
  const noRows = Promise.resolve({ data: [] as PurchaseRow[] });
  const buyerPurchases = (column: "registry_item_id" | "cash_fund_id", ids: string[]) =>
    isVerifiedBuyer && ids.length > 0
      ? supabaseAdmin
          .from("purchases")
          .select("registry_item_id, cash_fund_id, amount")
          .eq("buyer_email", buyerEmail!.toLowerCase())
          .neq("status", "cancelled")
          .in(column, ids)
      : noRows;

  // These lookups only need the items, so they run at the same time.
  const parentPurchasedIds = allItems.filter((i) => i.is_parent_purchased).map((i) => i.id);
  const [{ data: coverPurchases }, { data: claimedPurchases }, { data: buyerItemPurchases }, { data: buyerFundPurchases }] =
    await Promise.all([
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
            .select("id, registry_item_id")
            .in("id", [...claimedItemByPurchase.keys()])
            .neq("status", "cancelled")
        : noRows,
      buyerPurchases("registry_item_id", allItems.map((i) => i.id)),
      buyerPurchases("cash_fund_id", allFunds.map((f) => f.id)),
    ]);

  const coverCounts = new Map<string, number>();
  for (const p of (coverPurchases || []) as PurchaseRow[]) {
    if (p.registry_item_id) {
      coverCounts.set(p.registry_item_id, (coverCounts.get(p.registry_item_id) || 0) + (p.quantity || 1));
    }
  }

  let hasReservation = ((claimedPurchases || []) as PurchaseRow[]).some(
    (p) => claimedItemByPurchase.get(p.id!) === p.registry_item_id
  );

  for (const p of [...(buyerItemPurchases || []), ...(buyerFundPurchases || [])] as PurchaseRow[]) {
    if (p.registry_item_id) {
      if (!myGifts.items) myGifts.items = {};
      myGifts.items[p.registry_item_id] = "reserved";
      if (reservableItemIds.has(p.registry_item_id)) hasReservation = true;
    }
    if (p.cash_fund_id && p.amount) {
      if (!myGifts.funds) myGifts.funds = {};
      myGifts.funds[p.cash_fund_id] = (myGifts.funds[p.cash_fund_id] || 0) + Number(p.amount);
    }
  }

  const shippingAddress = hasReservation
    ? (registry.settings as RegistrySettings | null)?.shipping_address
    : undefined;

  const totalItems = allItems.length;
  const fulfilledItems = allItems.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress = totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;

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

      {/* Hero Banner — baby registries reserve 400px for the decorative
          illustrations; personal registries size to content with a looser
          minimum, and tighten further when there's no welcome message. */}
      <section
        className={`relative flex items-center justify-center bg-white py-12 ${
          isBabyRegistry
            ? "min-h-[400px]"
            : registry.description
              ? "min-h-[260px]"
              : "min-h-[200px]"
        }`}
      >
        {/* Decorative illustrations — baby-specific; personal registries keep
            a clean hero. Pinned to a 1440px canvas. */}
        {isBabyRegistry && (
          <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1440px] lg:block" aria-hidden="true">
            {/* Left side */}
            <img src="/hero/star-teal-left.svg" alt="" className="absolute left-[89px] top-[108px] w-[62px] h-[63px]" />
            <img src="/hero/heart-red.svg" alt="" className="absolute left-[174px] top-[33px] w-[70px] h-[57px]" />
            <img src="/hero/panda.svg" alt="" className="absolute left-[209px] top-[98px] w-[192px] h-[220px]" />
            <img src="/hero/spoon-and-fork.svg" alt="" className="absolute left-[44px] top-[230px] w-[99px] h-[112px] -rotate-[29deg]" />
            {/* Right side */}
            <img src="/hero/heart-yellow.svg" alt="" className="absolute right-[134px] top-[45px] w-[55px] h-[45px]" />
            <img src="/hero/bottle.svg" alt="" className="absolute right-[284px] top-[71px] w-[72px] h-[122px] rotate-[21deg]" />
            <img src="/hero/bib.svg" alt="" className="absolute right-[55px] top-[139px] w-[113px] h-[96px] rotate-[4deg]" />
            <img src="/hero/socks.svg" alt="" className="absolute right-[245px] top-[265px] w-[130px] h-[105px]" />
            <img src="/hero/star-teal-right.svg" alt="" className="absolute right-[62px] top-[284px] w-[62px] h-[63px]" />
          </div>
        )}
        {/* Center content */}
        <div className="relative z-10 flex max-w-[575px] flex-col items-center gap-4 px-4 text-center">
          <RegistryAvatar
            photoUrl={registry.photo_url}
            names={registry.honoree_names || registry.parent_names}
          />
          <h1 className="text-4xl font-bold leading-[44px] tracking-tight text-primary">
            {registry.title}
          </h1>
          {registry.event_date && (
            <p className="flex items-center gap-2 text-secondary">
              <Calendar className="h-4 w-4" />
              {new Date(registry.event_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {registry.description && (
            <p className="text-secondary whitespace-pre-line">
              {registry.description}
            </p>
          )}
          <div className="w-full max-w-[566px]">
            <div className="flex justify-between text-sm text-secondary mb-1">
              <span>
                {fulfilledItems} of {totalItems} gifts fulfilled
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} aria-label="Gifts fulfilled" />
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-tertiary">
            <LockOpen className="h-3.5 w-3.5" />
            Reserve a gift in 10 seconds — no sign-up required.
          </p>
          {owner && ownerRelation && (
            <div className="flex flex-col items-center gap-2 border-t border-secondary pt-4">
              <p className="text-sm text-secondary">
                Shared by{" "}
                <Link
                  href={owner.path}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {owner.name}
                </Link>
              </p>
              {!ownerRelation.isOwner && (
                <FollowButton
                  publicId={owner.publicId}
                  name={owner.name}
                  state={ownerRelation.state}
                  returnTo={`/r/${slug}`}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Items */}
      <main className="container mx-auto px-4 py-8">
        {totalItems === 0 && allFunds.length === 0 ? (
          <div className="text-center py-16 text-tertiary">
            <p>This registry doesn&apos;t have any items yet.</p>
          </div>
        ) : (
          <PublicRegistryGrid
            items={allItems}
            categories={allCategories}
            cashFunds={allFunds}
            parentName={parentName}
            paymentMethods={paymentMethods}
            shippingAddress={shippingAddress}
            myGifts={myGifts}
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
