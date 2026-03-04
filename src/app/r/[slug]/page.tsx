import { notFound } from "next/navigation";
import { Baby, Calendar, ExternalLink, Package, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { ReserveItemDialog } from "@/components/reserve-item-dialog";
import { CoverItemDialog } from "@/components/cover-item-dialog";
import { ContributeFundDialog } from "@/components/contribute-fund-dialog";
import type { PaymentMethods } from "@/lib/types";
import type { Metadata } from "next";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { getCategorySectionId } from "@/lib/category-section-id";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SuggestItemDialog } from "@/components/suggest-item-dialog";
import { Tag } from "@/components/ui/tag";
import { UsedConditionTag } from "@/components/ui/used-condition-tag";

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
    title: `${registry.title} | Baby Akachan`,
    description: registry.description || `View and shop ${registry.title}`,
    ...(!registry.is_public && { robots: { index: false, follow: false } }),
  };
}

export default async function PublicRegistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  const paymentMethods = (registry.settings as any)?.payment_methods as
    | PaymentMethods
    | undefined;

  const totalItems = allItems.length;
  const fulfilledItems = allItems.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress = totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;

  // Group items by category
  const itemsByCategory = new Map<string | null, RegistryItem[]>();
  for (const item of allItems) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) {
      itemsByCategory.set(key, []);
    }
    itemsByCategory.get(key)!.push(item);
  }

  // Build navigation items for category sidebar
  const navItems: CategoryNavItem[] = [];
  if (allFunds.length > 0) {
    navItems.push({
      id: getCategorySectionId("gift-funds"),
      name: "Gift Funds",
      count: allFunds.length,
    });
  }
  for (const category of allCategories) {
    const categoryItems = itemsByCategory.get(category.id) || [];
    if (categoryItems.length > 0) {
      navItems.push({
        id: getCategorySectionId(category.id),
        name: category.name,
        count: categoryItems.length,
      });
    }
  }
  const uncategorizedItems = itemsByCategory.get(null) || [];
  if (uncategorizedItems.length > 0) {
    navItems.push({
      id: getCategorySectionId(null),
      name: "Other Items",
      count: uncategorizedItems.length,
    });
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <Baby className="h-5 w-5 text-brand-600" />
            <span>Baby Akachan</span>
          </a>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative flex h-[400px] items-center justify-center overflow-hidden bg-white">
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
              {new Date(registry.event_date).toLocaleDateString("en-US", {
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
        </div>
      </section>

      {/* Items */}
      <main className="container mx-auto px-4 py-8">
        {totalItems === 0 && allFunds.length === 0 ? (
          <div className="text-center py-16 text-tertiary">
            <p>This registry doesn&apos;t have any items yet.</p>
          </div>
        ) : (
          <div className="flex gap-8 items-start">
            {navItems.length > 1 && <CategoryNav categories={navItems} suggestButton={<SuggestItemDialog registryId={registry.id} categories={allCategories.map((c) => ({ id: c.id, name: c.name }))} />} />}
            <div className="flex-1 min-w-0 space-y-10">
            {/* Cash Funds */}
            {allFunds.length > 0 && (
              <div id={getCategorySectionId("gift-funds")} className="scroll-mt-4">
                <h2 className="text-xl font-semibold mb-4">Gift Funds</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {allFunds.map((fund) => {
                    const fundProgress =
                      fund.goal_amount && fund.goal_amount > 0
                        ? (fund.current_amount / fund.goal_amount) * 100
                        : 0;
                    return (
                      <Card key={fund.id} className="py-0 gap-0 rounded-xl shadow-none border-[#e9eaeb]">
                        <CardContent className="flex flex-col gap-4 p-4">
                          <h3 className="font-semibold text-2xl leading-8 text-[#181d27]">
                            {fund.title}
                          </h3>
                          {fund.description && (
                            <p className="text-sm text-[#535862] whitespace-pre-line">
                              {fund.description}
                            </p>
                          )}
                          {fund.goal_amount && (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-sm">
                                <span>
                                  ${fund.current_amount.toFixed(0)} raised
                                </span>
                                <span>
                                  ${fund.goal_amount.toFixed(0)} goal
                                </span>
                              </div>
                              <Progress value={fundProgress} />
                              <span className="text-xs">
                                ${Math.max(0, fund.goal_amount - fund.current_amount).toFixed(0)} remaining
                              </span>
                            </div>
                          )}
                          <div className="flex justify-end">
                            <ContributeFundDialog
                              fund={fund}
                              paymentMethods={paymentMethods}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Separator className="mt-10" />
              </div>
            )}

            {/* Items by category */}
            {allCategories.map((category) => {
              const categoryItems = itemsByCategory.get(category.id) || [];
              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} id={getCategorySectionId(category.id)} className="scroll-mt-4">
                  <h2 className="text-xl font-semibold mb-4">
                    {category.name}
                    <Badge variant="secondary" className="ml-2">
                      {categoryItems.length}
                    </Badge>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryItems.map((item) => {
                      const isFulfilled =
                        item.quantity_fulfilled >= item.quantity_needed;
                      const remaining =
                        item.quantity_needed - item.quantity_fulfilled;

                      return (
                        <Card
                          key={item.id}
                          className={`py-0 gap-0 rounded-xl shadow-none ${
                            isFulfilled && !item.is_parent_purchased
                              ? "opacity-60 border-[#f5f5f5]"
                              : item.is_parent_purchased
                                ? "bg-[rgba(160,228,212,0.2)] border-[#d5d7da]"
                                : "border-[#d5d7da]"
                          }`}
                        >
                          <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                            <div className="flex gap-3">
                              <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-[#fdfdfd]">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="size-16 rounded-md object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-tertiary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col gap-2 items-start">
                                <h3 className="font-medium text-sm leading-tight">
                                  {item.title}
                                </h3>
                                <div className="flex flex-wrap gap-2.5">
                                  {item.is_parent_purchased ? (
                                    <Tag variant="parent-purchased">Purchased by parent</Tag>
                                  ) : isFulfilled ? (
                                    <Tag variant="guest-purchased">Already purchased by guest</Tag>
                                  ) : (
                                    <>
                                      {item.is_essential && (
                                        <Tag variant="most-wanted">Most wanted</Tag>
                                      )}
                                    </>
                                  )}
                                  {item.is_open_to_used && (
                                    <UsedConditionTag condition={item.minimum_condition} />
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5">
                                  {item.price && (
                                    <span className="text-sm font-semibold">
                                      ${item.price.toFixed(2)}
                                    </span>
                                  )}
                                  <span className="text-xs text-[#414651]">
                                    {remaining} of {item.quantity_needed} still needed
                                  </span>
                                </div>
                                {item.notes && (
                                  <p className="text-sm text-[#414651] whitespace-pre-line line-clamp-2">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {(item.is_parent_purchased || !isFulfilled) && (
                              <div className="flex items-center justify-end gap-2">
                                {item.is_parent_purchased ? (
                                  <CoverItemDialog
                                    item={item}
                                    paymentMethods={paymentMethods}
                                  />
                                ) : (
                                  <>
                                    {item.external_url && (
                                      <Button
                                        variant="outline"
                                        asChild
                                      >
                                        <a href={item.external_url} target="_blank" rel="noopener noreferrer">
                                          <span className="inline-flex items-center gap-1.5">
                                            <ExternalLink className="h-4 w-4 shrink-0" />
                                            Shop
                                          </span>
                                        </a>
                                      </Button>
                                    )}
                                    <ReserveItemDialog item={item} />
                                  </>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized */}
            {(itemsByCategory.get(null) || []).length > 0 && (
              <div id={getCategorySectionId(null)} className="scroll-mt-4">
                <h2 className="text-xl font-semibold mb-4">Other Items</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {itemsByCategory.get(null)!.map((item) => {
                    const isFulfilled =
                      item.quantity_fulfilled >= item.quantity_needed;
                    const remaining =
                      item.quantity_needed - item.quantity_fulfilled;
                    return (
                      <Card
                        key={item.id}
                        className={`py-0 gap-0 rounded-xl shadow-none ${
                          isFulfilled && !item.is_parent_purchased
                            ? "opacity-60 border-[#f5f5f5]"
                            : item.is_parent_purchased
                              ? "bg-[rgba(160,228,212,0.2)] border-[#d5d7da]"
                              : "border-[#d5d7da]"
                        }`}
                      >
                        <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                          <div className="flex-1 min-w-0 flex flex-col gap-2 items-start">
                            <h3 className="font-medium text-sm">{item.title}</h3>
                            <div className="flex flex-wrap gap-2.5">
                              {item.is_parent_purchased ? (
                                <Tag variant="parent-purchased">Purchased by parent</Tag>
                              ) : isFulfilled ? (
                                <Tag variant="guest-purchased">Already purchased by guest</Tag>
                              ) : (
                                <>
                                  {item.is_essential && (
                                    <Tag variant="most-wanted">Most wanted</Tag>
                                  )}
                                </>
                              )}
                              {item.is_open_to_used && (
                                <UsedConditionTag condition={item.minimum_condition} />
                              )}
                            </div>
                            <div className="flex items-center gap-2.5">
                              {item.price && (
                                <span className="text-sm font-semibold">
                                  ${item.price.toFixed(2)}
                                </span>
                              )}
                              <span className="text-xs text-[#414651]">
                                {remaining} of {item.quantity_needed} still needed
                              </span>
                            </div>
                          </div>
                          {(item.is_parent_purchased || !isFulfilled) && (
                            <div className="flex items-center justify-end gap-2">
                              {item.is_parent_purchased ? (
                                <CoverItemDialog
                                  item={item}
                                  paymentMethods={paymentMethods}
                                />
                              ) : (
                                <ReserveItemDialog item={item} />
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-tertiary">
          Powered by{" "}
          <a href="/" className="font-medium text-brand-600 hover:underline">
            Baby Akachan
          </a>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
