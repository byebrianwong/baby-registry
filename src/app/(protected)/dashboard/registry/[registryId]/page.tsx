import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  Settings,
  ClipboardList,
  Mail,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { AddItemDialog } from "@/components/add-item-dialog";
import { ItemCard } from "@/components/item-card";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RegistryTabs } from "@/components/registry-tabs";
import { CategoryManager } from "@/components/category-manager";
import { CancelReservationButton } from "./cancel-reservation-button";

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
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default async function RegistryManagePage({
  params,
}: {
  params: Promise<{ registryId: string }>;
}) {
  const { registryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: registry } = await supabase
    .from("registries")
    .select("*")
    .eq("id", registryId)
    .eq("owner_id", user.id)
    .single();

  if (!registry) {
    notFound();
  }

  const [{ data: categories }, { data: items }, { data: purchases }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("registry_id", registryId)
        .order("sort_order"),
      supabase
        .from("registry_items")
        .select("*")
        .eq("registry_id", registryId)
        .order("sort_order"),
      supabase
        .from("purchases")
        .select("*, registry_items!registry_item_id(title, registry_id), cash_funds!cash_fund_id(title, registry_id)")
        .order("created_at", { ascending: false }),
    ]);

  const allItems = (items || []) as RegistryItem[];
  const allCategories = (categories || []) as Category[];

  // Filter purchases to this registry
  const allPurchases = (purchases || []).filter((p: any) => {
    if (p.registry_items?.registry_id === registryId) return true;
    if (p.cash_funds?.registry_id === registryId) return true;
    return false;
  }).map((p: any) => ({
    ...p,
    item_title: p.registry_items?.title || p.cash_funds?.title || "Unknown item",
  }));

  const totalItems = allItems.length;
  const fulfilledItems = allItems.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress = totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;
  const totalValue = allItems.reduce((sum, i) => sum + (i.price || 0), 0);

  // Group items by category
  const itemsByCategory = new Map<string | null, RegistryItem[]>();
  for (const item of allItems) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) {
      itemsByCategory.set(key, []);
    }
    itemsByCategory.get(key)!.push(item);
  }

  const registryUrl = `/r/${registry.slug}`;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{registry.title}</h1>
          {registry.event_date && (
            <p className="text-tertiary">
              Due date:{" "}
              {new Date(registry.event_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <CopyLinkButton slug={registry.slug} />
          <Button variant="outline" asChild>
            <Link href={registryUrl} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/registry/${registryId}/checklist`}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Checklist
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/registry/${registryId}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-tertiary">Total Items</p>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-tertiary">Fulfilled</p>
            <p className="text-2xl font-bold">{fulfilledItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-tertiary">Completion</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
              <Progress value={progress} className="flex-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-tertiary">Total Value</p>
            <p className="text-2xl font-bold">${totalValue.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <RegistryTabs
        totalItems={totalItems}
        purchaseCount={allPurchases.length}
        itemsContent={
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Registry Items</h2>
              <div className="flex gap-2">
                <CategoryManager
                  registryId={registryId}
                  categories={allCategories}
                />
                <AddItemDialog registryId={registryId} categories={allCategories} />
              </div>
            </div>

            {totalItems === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-tertiary">
                    No items yet. Add items manually or browse the checklist.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <AddItemDialog registryId={registryId} categories={allCategories} />
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/registry/${registryId}/checklist`}>
                        Browse Checklist
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {allCategories.map((category) => {
                  const categoryItems = itemsByCategory.get(category.id) || [];
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        {category.name}
                        <Badge variant="secondary">{categoryItems.length}</Badge>
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {categoryItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            registryId={registryId}
                            isOwner
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Uncategorized items */}
                {(itemsByCategory.get(null) || []).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Other</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {itemsByCategory.get(null)!.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          registryId={registryId}
                          isOwner
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        }
        purchasesContent={
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Gift Activity</h2>
              <p className="text-sm text-tertiary">
                See who has reserved items and contributed to funds
              </p>
            </div>

            {allPurchases.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-tertiary">
                    No gifts reserved yet. Share your registry link to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allPurchases.map((purchase: any) => {
                  const isCancelled = purchase.status === "cancelled";
                  return (
                    <Card
                      key={purchase.id}
                      className={isCancelled ? "opacity-50" : ""}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {purchase.buyer_name}
                              </span>
                              {isCancelled ? (
                                <Badge variant="destructive" className="text-xs">
                                  Cancelled
                                </Badge>
                              ) : (
                                <Badge
                                  variant={purchase.cash_fund_id ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {purchase.cash_fund_id ? "Contribution" : "Reserved"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1">
                              {purchase.cash_fund_id ? (
                                <>
                                  <DollarSign className="inline h-3 w-3 mr-1" />
                                  Contributed{" "}
                                  <span className="font-medium">${purchase.amount}</span>{" "}
                                  to <span className="font-medium">{purchase.item_title}</span>
                                </>
                              ) : (
                                <>
                                  Reserved{" "}
                                  {purchase.quantity > 1 && <span>{purchase.quantity}x </span>}
                                  <span className="font-medium">{purchase.item_title}</span>
                                </>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-tertiary">
                              {purchase.buyer_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {purchase.buyer_email}
                                </span>
                              )}
                              <span>
                                {new Date(purchase.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {purchase.message && (
                              <p className="mt-2 text-sm text-tertiary flex items-start gap-1">
                                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                &ldquo;{purchase.message}&rdquo;
                              </p>
                            )}
                          </div>
                          {!isCancelled && (
                            <CancelReservationButton
                              purchaseId={purchase.id}
                              registryId={registryId}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
