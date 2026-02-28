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
    .select("title, description")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!registry) return { title: "Registry Not Found" };

  return {
    title: `${registry.title} | Baby Akachan`,
    description: registry.description || `View and shop ${registry.title}`,
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
    .eq("is_public", true)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-3">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <Baby className="h-5 w-5 text-primary" />
            <span>Baby Akachan</span>
          </a>
        </div>
      </header>

      {/* Registry Header */}
      <section className="border-b bg-muted/30 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{registry.title}</h1>
          {registry.event_date && (
            <p className="mt-2 flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(registry.event_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {registry.description && (
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {registry.description}
            </p>
          )}
          <div className="mx-auto mt-6 max-w-xs">
            <div className="flex justify-between text-sm mb-1">
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
          <div className="text-center py-16 text-muted-foreground">
            <p>This registry doesn&apos;t have any items yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Cash Funds */}
            {allFunds.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Gift Funds</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {allFunds.map((fund) => {
                    const fundProgress =
                      fund.goal_amount && fund.goal_amount > 0
                        ? (fund.current_amount / fund.goal_amount) * 100
                        : 0;
                    return (
                      <Card key={fund.id}>
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-lg">
                            {fund.title}
                          </h3>
                          {fund.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {fund.description}
                            </p>
                          )}
                          {fund.goal_amount && (
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>
                                  ${fund.current_amount.toFixed(0)} raised
                                </span>
                                <span>
                                  ${fund.goal_amount.toFixed(0)} goal
                                </span>
                              </div>
                              <Progress value={fundProgress} />
                            </div>
                          )}
                          <div className="mt-4">
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
                <div key={category.id}>
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
                          className={
                            isFulfilled && !item.is_parent_purchased
                              ? "opacity-50"
                              : item.is_parent_purchased
                                ? "border-brand-600/30 bg-brand-600/5"
                                : ""
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="h-16 w-16 rounded-md object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm leading-tight">
                                  {item.title}
                                </h3>
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  {item.is_essential && (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      Essential
                                    </Badge>
                                  )}
                                  {item.price && (
                                    <span className="text-xs text-muted-foreground">
                                      ${item.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                {item.quantity_needed > 1 && !isFulfilled && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {remaining} of {item.quantity_needed} still
                                    needed
                                  </p>
                                )}
                              </div>
                            </div>

                            {item.notes && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                {item.notes}
                              </p>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                              {item.is_parent_purchased ? (
                                <>
                                  <Badge variant="outline" className="border-brand-600/50 text-brand-600 text-xs">
                                    Bought by parent
                                  </Badge>
                                  <CoverItemDialog
                                    item={item}
                                    paymentMethods={paymentMethods}
                                  />
                                </>
                              ) : isFulfilled ? (
                                <Badge variant="secondary">Fulfilled</Badge>
                              ) : (
                                <>
                                  <ReserveItemDialog item={item} />
                                  {item.external_url && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a
                                        href={item.external_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        Shop
                                      </a>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
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
              <div>
                <h2 className="text-xl font-semibold mb-4">Other Items</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {itemsByCategory.get(null)!.map((item) => {
                    const isFulfilled =
                      item.quantity_fulfilled >= item.quantity_needed;
                    return (
                      <Card
                        key={item.id}
                        className={
                          isFulfilled && !item.is_parent_purchased
                            ? "opacity-50"
                            : item.is_parent_purchased
                              ? "border-brand-600/30 bg-brand-600/5"
                              : ""
                        }
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium text-sm">{item.title}</h3>
                          {item.price && (
                            <p className="text-xs text-muted-foreground">
                              ${item.price.toFixed(2)}
                            </p>
                          )}
                          <div className="mt-2">
                            {item.is_parent_purchased ? (
                              <>
                                <Badge variant="outline" className="border-brand-600/50 text-brand-600 text-xs">
                                  Bought by parent
                                </Badge>
                                <CoverItemDialog
                                  item={item}
                                  paymentMethods={paymentMethods}
                                />
                              </>
                            ) : isFulfilled ? (
                              <Badge variant="secondary">Fulfilled</Badge>
                            ) : (
                              <ReserveItemDialog item={item} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by{" "}
          <a href="/" className="font-medium text-foreground hover:underline">
            Baby Akachan
          </a>
        </div>
      </footer>
    </div>
  );
}
