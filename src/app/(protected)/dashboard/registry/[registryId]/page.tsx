import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  Settings,
  ClipboardList,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AddItemDialog } from "@/components/add-item-dialog";
import { ItemCard } from "@/components/item-card";
import {
  parseHiddenPlainLinkItems,
  parseRetailerRegistries,
  plainLinksByStore,
  storesWithRegistryLinks,
} from "@/lib/retailers";
import { PlainLinksNotice, type PlainLinkGroup } from "@/components/plain-links-notice";
import { CopyLinkButton } from "@/components/copy-link-button";
import { RegistryTabs } from "@/components/registry-tabs";
import { StorePerksCard } from "@/components/store-perks-card";
import { buildStorePerks, parseStorePerksState, readyPerkCount } from "@/lib/store-perks";
import { CancelReservationButton } from "./cancel-reservation-button";
import { SuggestionInbox } from "./suggestion-inbox";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { getCategorySectionId } from "@/lib/category-section-id";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { getChecklistProgress } from "@/lib/checklist-matching";
import { AddCashFundDialog } from "@/components/add-cash-fund-dialog";
import { CashFundCard } from "@/components/cash-fund-card";
import { PandaMark } from "@/components/panda-mark";
import { copyForRegistry } from "@/lib/registry-copy";
import { formatDollars, formatPrice } from "@/lib/money";
import { listEventsForRegistry } from "@/lib/events-server";
import { RegistryEventsBanner } from "@/components/registry-events-banner";

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
  searchParams,
}: {
  params: Promise<{ registryId: string }>;
  searchParams: Promise<{ highlight?: string; tab?: string }>;
}) {
  const { registryId } = await params;
  const { highlight, tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is a manager of this registry (falls back to owner_id if migration not run)
  let isOwner = false;
  const { data: managerRecord, error: managerError } = await supabaseAdmin
    .from("registry_managers")
    .select("role")
    .eq("registry_id", registryId)
    .eq("user_id", user.id)
    .single();

  const { data: registry } = await supabase
    .from("registries")
    .select("*")
    .eq("id", registryId)
    .single();

  if (!registry) {
    notFound();
  }

  // Determine access: use registry_managers if available, fall back to owner_id
  if (managerRecord) {
    isOwner = managerRecord.role === "owner";
  } else if (managerError || !managerRecord) {
    // Table may not exist yet (migration not run) — fall back to owner_id
    if (registry.owner_id !== user.id) {
      notFound();
    }
    isOwner = true;
  }

  const [{ data: categories }, { data: items }, { data: purchases }, { data: suggestions }, { data: cashFunds }, linkedEvents] =
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
        .select("*, registry_items!registry_item_id(title, registry_id, price, is_parent_purchased), cash_funds!cash_fund_id(title, registry_id)")
        .order("created_at", { ascending: false }),
      supabase
        .from("suggestions")
        .select("*")
        .eq("registry_id", registryId)
        .order("created_at", { ascending: false }),
      supabase
        .from("cash_funds")
        .select("*")
        .eq("registry_id", registryId)
        .order("created_at"),
      listEventsForRegistry(registryId),
    ]);

  const allItems = (items || []) as RegistryItem[];
  const allCategories = (categories || []) as Category[];
  const dismissedChecklistItems = (registry.settings as Record<string, unknown> | null)?.checklist_dismissed as string[] | undefined;
  const checklistProgress = getChecklistProgress(allItems.map((i) => i.title), dismissedChecklistItems);
  const copy = copyForRegistry(registry);
  const showChecklist = copy.checklistAvailable;

  // Filter purchases to this registry
  const allPurchases = (purchases || []).filter((p: any) => {
    if (p.registry_items?.registry_id === registryId) return true;
    if (p.cash_funds?.registry_id === registryId) return true;
    return false;
  }).map((p: any) => ({
    ...p,
    item_title: p.registry_items?.title || p.cash_funds?.title || "Unknown item",
  }));

  // Build purchase lookup maps for item/fund cards
  const purchasesByItemId = new Map<string, typeof allPurchases>();
  const purchasesByFundId = new Map<string, typeof allPurchases>();
  for (const p of allPurchases) {
    if (p.registry_item_id) {
      if (!purchasesByItemId.has(p.registry_item_id)) purchasesByItemId.set(p.registry_item_id, []);
      purchasesByItemId.get(p.registry_item_id)!.push(p);
    }
    if (p.cash_fund_id) {
      if (!purchasesByFundId.has(p.cash_fund_id)) purchasesByFundId.set(p.cash_fund_id, []);
      purchasesByFundId.get(p.cash_fund_id)!.push(p);
    }
  }

  const allSuggestions = (suggestions || []) as {
    id: string;
    title: string;
    external_url: string | null;
    price: number | null;
    notes: string | null;
    suggested_by_name: string;
    suggested_by_email: string | null;
    status: "pending" | "offering" | "added" | "accepted" | "declined";
    created_at: string;
  }[];
  const pendingSuggestionCount = allSuggestions.filter(
    (s) => s.status === "pending" || s.status === "offering"
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
  const allFunds = (cashFunds || []) as {
    id: string;
    title: string;
    description: string | null;
    goal_amount: number | null;
    current_amount: number;
  }[];
  if (allFunds.length > 0) {
    navItems.unshift({
      id: "gift-funds",
      name: "Gift Funds",
      count: allFunds.length,
    });
  }

  const settings = registry.settings as Record<string, any> | null;
  const taxEnabled = settings?.tax_enabled !== false;
  // Store registry notices in the item dialogs are for baby registries only.
  const linkedRegistries =
    registry.registry_type === "baby" ? parseRetailerRegistries(settings) : undefined;
  // A registry link on any item shows the owner has a registry at that store,
  // even before they link it in settings.
  const registryLinkStores = linkedRegistries
    ? storesWithRegistryLinks(allItems.map((i) => i.external_url))
    : undefined;
  // Items with a plain link at a store where the owner has a registry, minus
  // the ones the owner asked not to be reminded about.
  const hiddenPlainLinkItems = new Set(parseHiddenPlainLinkItems(settings));
  const plainLinkGroups: PlainLinkGroup[] = linkedRegistries
    ? [...plainLinksByStore(allItems, linkedRegistries.map((r) => r.store))]
        .map(([storeId, items]) => ({
          storeId,
          items: items
            .filter((i) => !hiddenPlainLinkItems.has(i.id))
            .map((i) => ({ id: i.id, title: i.title })),
        }))
        .filter((group) => group.items.length > 0)
    : [];
  // Store perks: one row per store registry the owner linked or has item links from.
  const perkRows = linkedRegistries
    ? buildStorePerks({
        items: allItems,
        purchases: allPurchases,
        linkedRegistries,
        dueDate: registry.event_date,
        today: new Date().toISOString().slice(0, 10),
        state: parseStorePerksState(settings),
      })
    : [];
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
              {copy.eventDateLabel}:{" "}
              {new Date(registry.event_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <CopyLinkButton path={`/r/${registry.slug}`} />
          <Button variant="outline" asChild>
            <a href={registryUrl} target="_blank" rel="noopener noreferrer">
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 shrink-0" />
                Preview
              </span>
            </a>
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

      {/* Events that link to this registry, and a way to plan one. */}
      <div className="mt-6">
        <RegistryEventsBanner registryId={registryId} events={linkedEvents} />
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
              <Progress value={progress} aria-label="Registry completion" className="flex-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-tertiary">Total Value</p>
            <p className="text-2xl font-bold">{formatDollars(totalValue)}</p>
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
              <div className="flex items-center gap-2">
                {showChecklist && (
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/registry/${registryId}/checklist`}>
                      <span className="inline-flex items-center gap-1.5">
                        <ProgressCircle
                          value={checklistProgress.total > 0 ? (checklistProgress.matched / checklistProgress.total) * 100 : 0}
                          size={20}
                          strokeWidth={2}
                        />
                        Checklist
                      </span>
                    </Link>
                  </Button>
                )}
                <AddCashFundDialog registryId={registryId} />
                <AddItemDialog registryId={registryId} categories={allCategories} zipCode={zipCode} registryType={registry.registry_type} eventType={registry.event_type} linkedRegistries={linkedRegistries} storesWithRegistryLinks={registryLinkStores} />
              </div>
            </div>

            {plainLinkGroups.length > 0 && (
              <div className="mb-6">
                <PlainLinksNotice registryId={registryId} groups={plainLinkGroups} />
              </div>
            )}

            {totalItems === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <PandaMark className="mb-4 h-20 w-auto" />
                  <p className="text-tertiary">
                    {showChecklist
                      ? "No items yet. Add items manually or browse the checklist."
                      : "No items yet. Add items from any store to get started."}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <AddItemDialog registryId={registryId} categories={allCategories} zipCode={zipCode} registryType={registry.registry_type} eventType={registry.event_type} linkedRegistries={linkedRegistries} storesWithRegistryLinks={registryLinkStores} />
                    {showChecklist && (
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/registry/${registryId}/checklist`}>
                          Browse Checklist
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex gap-8 items-start">
                {/* Shown from one section up, like the public page, so a
                    registry with a single category still gets the sidebar. */}
                {navItems.length >= 1 && <CategoryNav categories={navItems} />}
                <div className="flex-1 min-w-0 space-y-8">
                  {/* Gift Funds */}
                  {allFunds.length > 0 && (
                    <div id="gift-funds" className="scroll-mt-20">
                      <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                        Gift Funds
                        <Badge variant="secondary">{allFunds.length}</Badge>
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {allFunds.map((fund) => (
                          <CashFundCard key={fund.id} fund={fund} registryId={registryId} highlightId={highlight} purchases={purchasesByFundId.get(fund.id)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {allCategories.map((category) => {
                    const categoryItems = itemsByCategory.get(category.id) || [];
                    if (categoryItems.length === 0) return null;

                    return (
                      <div key={category.id} id={getCategorySectionId(category.id)} className="scroll-mt-20">
                        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
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
                              highlightId={highlight}
                              purchases={purchasesByItemId.get(item.id)}
                              selfPurchaseButtonLabel={copy.selfPurchaseButton}
                              registryType={registry.registry_type}
                              eventType={registry.event_type}
                              linkedRegistries={linkedRegistries}
                              storesWithRegistryLinks={registryLinkStores}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Uncategorized items */}
                  {(itemsByCategory.get(null) || []).length > 0 && (
                    <div id={getCategorySectionId(null)} className="scroll-mt-20">
                      <h3 className="font-display text-lg font-semibold mb-3">Other</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {itemsByCategory.get(null)!.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            registryId={registryId}
                            isOwner
                            categories={allCategories}
                            zipCode={zipCode}
                            highlightId={highlight}
                            purchases={purchasesByItemId.get(item.id)}
                            selfPurchaseButtonLabel={copy.selfPurchaseButton}
                            registryType={registry.registry_type}
                            eventType={registry.event_type}
                            linkedRegistries={linkedRegistries}
                            storesWithRegistryLinks={registryLinkStores}
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
                  const isParentPurchased = purchase.registry_items?.is_parent_purchased ?? false;
                  const tagType = isCancelled
                    ? "cancelled"
                    : purchase.cash_fund_id
                      ? "contribution"
                      : isParentPurchased
                        ? "covered"
                        : "purchased";
                  const displayAmount = purchase.cash_fund_id
                    ? purchase.amount
                    : purchase.registry_items?.price;
                  return (
                    <Card
                      key={purchase.id}
                      className={`py-0 ${isCancelled ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-4">
                            <span className="flex-1 min-w-0 text-sm font-medium text-secondary">
                              {purchase.buyer_name}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                  tagType === "cancelled"
                                    ? "bg-error-primary/10 border-error-primary/20 text-error-primary"
                                    : tagType === "contribution"
                                      ? "bg-mint-500 border-mint-500 text-primary"
                                      : tagType === "covered"
                                        ? "bg-mint-200 border-mint-200 text-primary"
                                        : "bg-sunshine-100 border-sunshine-100 text-primary"
                                }`}
                              >
                                {tagType === "cancelled"
                                  ? "Cancelled"
                                  : tagType === "contribution"
                                    ? "Contribution"
                                    : tagType === "covered"
                                      ? "Covered by guest"
                                      : "Purchased by guest"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-secondary">
                                {purchase.cash_fund_id
                                  ? purchase.item_title
                                  : `Reserved ${purchase.quantity > 1 ? `${purchase.quantity}x ` : ""}${purchase.item_title}`}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-secondary">
                                {displayAmount != null
                                  ? formatPrice(Number(displayAmount))
                                  : ""}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-secondary">
                                {purchase.buyer_email}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <span className="text-xs text-secondary">
                                {new Date(purchase.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          {purchase.message && (
                            <p className="text-sm text-secondary whitespace-pre-line">
                              {purchase.message}
                            </p>
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
          <SuggestionInbox suggestions={allSuggestions} registryId={registryId} />
        }
        perksContent={
          perkRows.length > 0 ? (
            <StorePerksCard
              registryId={registryId}
              rows={perkRows}
              emails={parseStorePerksState(settings).emails}
              hasDueDate={!!registry.event_date}
            />
          ) : undefined
        }
        perksCount={readyPerkCount(perkRows)}
        defaultTab={tab}
      />

      <ScrollToTop />
    </div>
  );
}
