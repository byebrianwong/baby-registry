import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  Settings,
  ClipboardList,
  Mail,
  MessageSquare,
  DollarSign,
  Lightbulb,
  Plus,
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
import { SuggestionActions } from "./suggestion-actions";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { getCategorySectionId } from "@/lib/category-section-id";
import { ScrollToTop } from "@/components/scroll-to-top";

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

  const [{ data: categories }, { data: items }, { data: purchases }, { data: suggestions }] =
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
      supabase
        .from("suggestions")
        .select("*")
        .eq("registry_id", registryId)
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

  const allSuggestions = (suggestions || []) as {
    id: string;
    title: string;
    external_url: string | null;
    price: number | null;
    notes: string | null;
    suggested_by_name: string;
    suggested_by_email: string | null;
    status: "pending" | "accepted" | "declined";
    created_at: string;
  }[];
  const pendingSuggestionCount = allSuggestions.filter(
    (s) => s.status === "pending"
  ).length;

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

  // Build navigation items for category sidebar
  const navItems: CategoryNavItem[] = [];
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
      name: "Other",
      count: uncategorizedItems.length,
    });
  }

  const settings = registry.settings as Record<string, any> | null;
  const taxEnabled = settings?.tax_enabled !== false;
  const zipCode = taxEnabled ? (settings?.zip_code as string | undefined) : undefined;
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
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 shrink-0" />
                Preview
              </span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/registry/${registryId}/settings`}>
              <span className="inline-flex items-center gap-1.5">
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </span>
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
        suggestionCount={pendingSuggestionCount}
        itemsContent={
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Registry Items</h2>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/registry/${registryId}/checklist`}>
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4 shrink-0" />
                      Checklist
                    </span>
                  </Link>
                </Button>
                <CategoryManager
                  registryId={registryId}
                  categories={allCategories}
                />
                <AddItemDialog registryId={registryId} categories={allCategories} zipCode={zipCode} />
              </div>
            </div>

            {totalItems === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-tertiary">
                    No items yet. Add items manually or browse the checklist.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <AddItemDialog registryId={registryId} categories={allCategories} zipCode={zipCode} />
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/registry/${registryId}/checklist`}>
                        Browse Checklist
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex gap-8 items-start">
                {navItems.length > 1 && <CategoryNav categories={navItems} />}
                <div className="flex-1 min-w-0 space-y-8">
                  {allCategories.map((category) => {
                    const categoryItems = itemsByCategory.get(category.id) || [];
                    if (categoryItems.length === 0) return null;

                    return (
                      <div key={category.id} id={getCategorySectionId(category.id)} className="scroll-mt-20">
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
                              categories={allCategories}
                              zipCode={zipCode}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Uncategorized items */}
                  {(itemsByCategory.get(null) || []).length > 0 && (
                    <div id={getCategorySectionId(null)} className="scroll-mt-20">
                      <h3 className="text-lg font-semibold mb-3">Other</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {itemsByCategory.get(null)!.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            registryId={registryId}
                            isOwner
                            categories={allCategories}
                            zipCode={zipCode}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
        suggestionsContent={
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Suggestion Inbox</h2>
              <p className="text-sm text-tertiary">
                Items suggested by your guests
              </p>
            </div>

            {allSuggestions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Lightbulb className="h-8 w-8 text-tertiary mb-2" />
                  <p className="text-tertiary">
                    No suggestions yet. Guests can suggest items from your registry page.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allSuggestions.map((suggestion) => {
                  const isActioned = suggestion.status !== "pending";
                  return (
                    <Card
                      key={suggestion.id}
                      className={isActioned ? "opacity-50" : ""}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {suggestion.title}
                              </span>
                              <Badge
                                variant={
                                  suggestion.status === "pending"
                                    ? "secondary"
                                    : suggestion.status === "accepted"
                                      ? "default"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {suggestion.status === "pending"
                                  ? "Pending"
                                  : suggestion.status === "accepted"
                                    ? "Added"
                                    : "Declined"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-tertiary">
                              <span>
                                Suggested by{" "}
                                <span className="font-medium text-primary">
                                  {suggestion.suggested_by_name}
                                </span>
                              </span>
                              {suggestion.suggested_by_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {suggestion.suggested_by_email}
                                </span>
                              )}
                              <span>
                                {new Date(suggestion.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {suggestion.price && (
                              <p className="text-sm mt-1">
                                ${suggestion.price.toFixed(2)}
                              </p>
                            )}
                            {suggestion.external_url && (
                              <a
                                href={suggestion.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-brand-600 hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View product
                              </a>
                            )}
                            {suggestion.notes && (
                              <p className="mt-2 text-sm text-tertiary flex items-start gap-1">
                                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                &ldquo;{suggestion.notes}&rdquo;
                              </p>
                            )}
                          </div>
                          {suggestion.status === "pending" && (
                            <SuggestionActions
                              suggestionId={suggestion.id}
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

      <ScrollToTop />
    </div>
  );
}
