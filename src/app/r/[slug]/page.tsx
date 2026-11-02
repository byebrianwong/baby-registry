import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Baby, Calendar, LockOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyBuyerLink } from "@/lib/buyer-link";
import type { PaymentMethods } from "@/lib/types";
import type { Metadata } from "next";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SuggestItemDialog } from "@/components/suggest-item-dialog";
import { PublicRegistryGrid } from "@/components/public-registry-grid";

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
  const supabase = await createClient();
  const { data: registry } = await supabase
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
  searchParams: Promise<{ email?: string; sig?: string }>;
}) {
  const { slug } = await params;
  const { email: buyerEmail, sig } = await searchParams;
  const supabase = await createClient();

  const { data: registry } = await supabase
    .from("registries")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!registry) {
    notFound();
  }

  const [{ data: categories }, { data: items }, { data: cashFunds }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("registry_id", registry.id)
        .order("sort_order"),
      supabase
        .from("registry_items")
        .select("*")
        .eq("registry_id", registry.id)
        .order("sort_order"),
      supabase
        .from("cash_funds")
        .select("*")
        .eq("registry_id", registry.id),
    ]);

  const allItems = (items || []) as RegistryItem[];
  const allCategories = (categories || []) as Category[];
  const allFunds = (cashFunds || []) as CashFund[];
  const parentName = registry.parent_names || "The Registry Owner";

  const paymentMethods = (registry.settings as any)?.payment_methods as
    | PaymentMethods
    | undefined;

  const shippingAddress = (registry.settings as any)?.shipping_address as string | undefined;

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
              .select("registry_item_id, cash_fund_id, amount")
              .eq("buyer_email", buyerEmail.toLowerCase())
              .neq("status", "cancelled")
              .in("registry_item_id", itemIds)
          );
        }
        if (fundIds.length > 0) {
          queries.push(
            supabaseAdmin
              .from("purchases")
              .select("registry_item_id, cash_fund_id, amount")
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
          <a href="/" className="flex items-center gap-2 font-semibold">
            <Baby className="h-5 w-5 text-brand-600" />
            <span>Regibee</span>
          </a>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative flex min-h-[400px] items-center justify-center bg-white py-12">
        {/* Decorative illustrations — hidden on small screens, pinned to a 1440px canvas */}
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
        {/* Center content */}
        <div className="relative z-10 flex max-w-[575px] flex-col items-center gap-4 px-4 text-center">
          <h1 className="text-4xl font-bold leading-[44px] tracking-tight text-[#181d27]">
            {registry.title}
          </h1>
          {registry.event_date && (
            <p className="flex items-center gap-2 text-[#414651]">
              <Calendar className="h-4 w-4" />
              {new Date(registry.event_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {registry.description && (
            <p className="text-[#414651] whitespace-pre-line">
              {registry.description}
            </p>
          )}
          <div className="w-full max-w-[566px]">
            <div className="flex justify-between text-sm text-[#414651] mb-1">
              <span>
                {fulfilledItems} of {totalItems} gifts fulfilled
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-[#535862]">
            <LockOpen className="h-3.5 w-3.5" />
            Reserve a gift in 10 seconds — no sign-up required.
          </p>
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
