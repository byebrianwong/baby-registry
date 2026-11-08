"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, Search, Store } from "lucide-react";
import { TightSelect } from "@/components/ui/tight-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { UsedConditionTag } from "@/components/ui/used-condition-tag";
import { ReserveItemDialog } from "@/components/reserve-item-dialog";
import { CoverItemDialog } from "@/components/cover-item-dialog";
import { ContributeFundDialog } from "@/components/contribute-fund-dialog";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { ItemImage } from "@/components/item-image";
import { getCategorySectionId } from "@/lib/category-section-id";
import type { PaymentMethods } from "@/lib/types";
import { classifyStoreLink, detectStore, STORES, type StoreId } from "@/lib/retailers";

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

interface Props {
  items: RegistryItem[];
  categories: Category[];
  cashFunds: CashFund[];
  parentName: string;
  paymentMethods?: PaymentMethods;
  shippingAddress?: string;
  myGifts: { items?: Record<string, string>; funds?: Record<string, number> };
  coverCounts: Record<string, number>;
  suggestButton: ReactNode;
  selfPurchasedLabel?: string;
  coverFlavor?: string;
  /** Stores where the owner has their own registry. Ids only: guests never
   *  get the owner's store registry links. */
  linkedStores?: StoreId[];
  /** Tell guests when a gift is on the owner's store registry. Baby
   *  registries only. */
  showStoreRegistries?: boolean;
}

type SortMode = "default" | "most-wanted" | "price-asc" | "price-desc";

const PRICE_BUCKETS = [
  { value: "any", label: "Any price", max: Infinity },
  { value: "25", label: "Under $25", max: 25 },
  { value: "50", label: "Under $50", max: 50 },
  { value: "100", label: "Under $100", max: 100 },
  { value: "250", label: "Under $250", max: 250 },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "most-wanted", label: "Most wanted first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function PublicRegistryGrid({
  items,
  categories,
  cashFunds,
  parentName,
  paymentMethods,
  shippingAddress,
  myGifts,
  coverCounts,
  suggestButton,
  selfPurchasedLabel = "Purchased by parent",
  coverFlavor,
  linkedStores = [],
  showStoreRegistries = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [priceBucket, setPriceBucket] = useState("any");
  const [sort, setSort] = useState<SortMode>("default");
  const [storeFilter, setStoreFilter] = useState<StoreId | "any">("any");

  // Offer a store filter only when items come from more than one known store.
  const storesInItems = STORES.filter((s) =>
    items.some((item) => detectStore(item.external_url)?.id === s.id)
  );
  const showStoreFilter = storesInItems.length >= 2;

  const normalizedQuery = search.trim().toLowerCase();
  const priceMax =
    PRICE_BUCKETS.find((b) => b.value === priceBucket)?.max ?? Infinity;

  const filteredItems = items.filter((item) => {
    if (normalizedQuery) {
      const haystack = `${item.title} ${item.notes ?? ""}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    if (priceMax !== Infinity && (item.price ?? Infinity) > priceMax) return false;
    if (storeFilter !== "any" && detectStore(item.external_url)?.id !== storeFilter) return false;
    return true;
  });
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sort) {
      case "most-wanted":
        return (b.is_essential ? 1 : 0) - (a.is_essential ? 1 : 0);
      case "price-asc":
        return (a.price ?? Infinity) - (b.price ?? Infinity);
      case "price-desc":
        return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      default:
        return 0;
    }
  });

  const filtersActive =
    normalizedQuery !== "" ||
    priceBucket !== "any" ||
    sort !== "default" ||
    storeFilter !== "any";

  // Group items by category (after filter/sort)
  const itemsByCategory = new Map<string | null, RegistryItem[]>();
  for (const item of sortedItems) {
    const key = item.category_id;
    if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
    itemsByCategory.get(key)!.push(item);
  }

  // Build sidebar nav from CURRENT (filtered) items so counts stay accurate
  const navItems: CategoryNavItem[] = [];
  if (cashFunds.length > 0) {
    navItems.push({
      id: getCategorySectionId("gift-funds"),
      name: "Gift Funds",
      count: cashFunds.length,
    });
  }
  for (const category of categories) {
    const count = (itemsByCategory.get(category.id) || []).length;
    if (count > 0) {
      navItems.push({
        id: getCategorySectionId(category.id),
        name: category.name,
        count,
      });
    }
  }
  const uncategorized = itemsByCategory.get(null) || [];
  if (uncategorized.length > 0) {
    navItems.push({
      id: getCategorySectionId(null),
      name: "Other Items",
      count: uncategorized.length,
    });
  }

  const noMatches =
    filtersActive &&
    sortedItems.length === 0 &&
    (sort !== "default" ||
      priceBucket !== "any" ||
      normalizedQuery !== "" ||
      storeFilter !== "any");

  return (
    <div className="flex gap-8 items-start">
      {navItems.length >= 1 && (
        <CategoryNav categories={navItems} suggestButton={suggestButton} />
      )}
      <div className="flex-1 min-w-0 space-y-10">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              className="w-full rounded-md border border-primary bg-primary py-2 pl-9 pr-3 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showStoreFilter && (
              <TightSelect<StoreId | "any">
                ariaLabel="Store filter"
                value={storeFilter}
                onChange={setStoreFilter}
                options={[
                  { value: "any", label: "Any store" },
                  ...storesInItems.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            )}
            <TightSelect
              ariaLabel="Price filter"
              value={priceBucket}
              onChange={setPriceBucket}
              options={PRICE_BUCKETS.map((b) => ({ value: b.value, label: b.label }))}
            />
            <TightSelect<SortMode>
              ariaLabel="Sort order"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {noMatches && (
          <div className="rounded-lg border border-dashed border-primary bg-secondary p-8 text-center text-sm text-tertiary">
            No items match your filters.{" "}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPriceBucket("any");
                setSort("default");
                setStoreFilter("any");
              }}
              className="font-medium text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Cash Funds — always visible */}
        {cashFunds.length > 0 && (
          <div id={getCategorySectionId("gift-funds")} className="scroll-mt-4">
            <h2 className="text-xl font-semibold mb-4">Gift Funds</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {cashFunds.map((fund) => {
                const fundProgress =
                  fund.goal_amount && fund.goal_amount > 0
                    ? (fund.current_amount / fund.goal_amount) * 100
                    : 0;
                const fundPurchased = !!(myGifts.funds && myGifts.funds[fund.id]);
                const fundPrevAmount = myGifts.funds?.[fund.id];
                return (
                  <Card key={fund.id} className="py-0 gap-0 rounded-2xl shadow-none border-primary">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-lg text-primary">
                            {fund.title}
                          </h3>
                          {fundPurchased && (
                            <img
                              src="/hero/panda.svg"
                              alt=""
                              className="h-8 w-8 shrink-0"
                              style={{ animation: "celebration-bounce 1.2s ease-in-out infinite" }}
                            />
                          )}
                        </div>
                        {fund.description && (
                          <p className="text-sm text-tertiary whitespace-pre-line">
                            {fund.description}
                          </p>
                        )}
                        {fund.goal_amount && fund.goal_amount > 0 && (
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
                            <span className="text-xs text-tertiary">
                              ${Math.max(0, fund.goal_amount - fund.current_amount).toFixed(0)} remaining
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <ContributeFundDialog
                          fund={fund}
                          paymentMethods={paymentMethods}
                          parentName={parentName}
                          alreadyPurchased={fundPurchased}
                          previousAmount={fundPrevAmount}
                          shippingAddress={shippingAddress}
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
        {categories.map((category) => {
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
                {categoryItems.map((item) => (
                  <PublicItemCard
                    key={item.id}
                    item={item}
                    categoryName={category.name}
                    coverCounts={coverCounts}
                    myGifts={myGifts}
                    paymentMethods={paymentMethods}
                    parentName={parentName}
                    shippingAddress={shippingAddress}
                    selfPurchasedLabel={selfPurchasedLabel}
                    coverFlavor={coverFlavor}
                    linkedStores={linkedStores}
                    showStoreRegistries={showStoreRegistries}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <div id={getCategorySectionId(null)} className="scroll-mt-4">
            <h2 className="text-xl font-semibold mb-4">Other Items</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorized.map((item) => (
                <PublicItemCard
                  key={item.id}
                  item={item}
                  categoryName={null}
                  coverCounts={coverCounts}
                  myGifts={myGifts}
                  paymentMethods={paymentMethods}
                  parentName={parentName}
                  shippingAddress={shippingAddress}
                  selfPurchasedLabel={selfPurchasedLabel}
                  coverFlavor={coverFlavor}
                  linkedStores={linkedStores}
                  showStoreRegistries={showStoreRegistries}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PublicItemCard({
  item,
  categoryName,
  coverCounts,
  myGifts,
  paymentMethods,
  parentName,
  shippingAddress,
  selfPurchasedLabel = "Purchased by parent",
  coverFlavor,
  linkedStores,
  showStoreRegistries,
}: {
  item: RegistryItem;
  categoryName: string | null;
  coverCounts: Record<string, number>;
  myGifts: Props["myGifts"];
  paymentMethods?: PaymentMethods;
  parentName: string;
  shippingAddress?: string;
  selfPurchasedLabel?: string;
  coverFlavor?: string;
  linkedStores: StoreId[];
  showStoreRegistries: boolean;
}) {
  const storeLink = classifyStoreLink(item.external_url);
  const store = storeLink?.store;
  // A registry link names the owner's store registry, so the gift counts
  // there. A link we can't classify counts only if the owner linked that store.
  const registryStoreName =
    showStoreRegistries &&
    storeLink &&
    (storeLink.kind === "registry" ||
      (storeLink.kind === "unknown" && linkedStores.includes(storeLink.store.id)))
      ? storeLink.store.name
      : undefined;
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;
  const itemPurchased = !!(myGifts.items && myGifts.items[item.id]);
  const coveredQty = coverCounts[item.id] || 0;
  const availableToGift = item.is_parent_purchased
    ? item.quantity_needed - coveredQty
    : remaining;
  const isFullyCovered = item.is_parent_purchased && coveredQty >= item.quantity_needed;

  return (
    <Card
      className={`py-0 gap-0 rounded-2xl shadow-none ${
        (isFulfilled && !item.is_parent_purchased) || isFullyCovered
          ? "opacity-60 border-tertiary"
          : item.is_parent_purchased
            ? "bg-mint-200/20 border-primary"
            : "border-primary"
      }`}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <ItemImage
                imageUrl={item.image_url}
                title={item.title}
                categoryName={categoryName}
              />
              {itemPurchased && (
                <img
                  src="/hero/panda.svg"
                  alt=""
                  className="absolute -bottom-2 -right-2 h-8 w-8"
                  style={{ animation: "celebration-bounce 1.2s ease-in-out infinite" }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2 items-start">
              <h3 className="font-medium text-sm leading-tight">{item.title}</h3>
              <div className="flex flex-wrap items-center gap-x-2.5">
                {item.price && (
                  <span className="text-sm font-semibold">
                    ${item.price.toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-secondary">
                  {item.is_parent_purchased
                    ? `${availableToGift} of ${item.quantity_needed} available to gift`
                    : `${remaining} of ${item.quantity_needed} still needed`}
                </span>
              </div>
              {store && (
                <span className="inline-flex items-center gap-1 text-xs text-tertiary">
                  <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  From {store.name}
                </span>
              )}
              {item.notes && (
                <p className="text-sm text-secondary whitespace-pre-line">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
          {/* Tags sit below the image because the column beside it is too narrow for them in a three-column grid. */}
          <div className="flex w-full min-w-0 flex-wrap gap-2.5 empty:hidden">
            {item.is_parent_purchased ? (
              <Tag variant="parent-purchased">{selfPurchasedLabel}</Tag>
            ) : isFulfilled ? (
              <Tag variant="guest-purchased">Already purchased by guest</Tag>
            ) : (
              item.is_essential && <Tag variant="most-wanted">Most wanted</Tag>
            )}
            {item.is_open_to_used && (
              <UsedConditionTag condition={item.minimum_condition} />
            )}
          </div>
        </div>

        {(item.is_parent_purchased
          ? availableToGift > 0 || itemPurchased
          : !isFulfilled || itemPurchased) && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {item.is_parent_purchased ? (
              <CoverItemDialog
                item={item}
                availableToGift={availableToGift}
                paymentMethods={paymentMethods}
                parentName={parentName}
                coverFlavor={coverFlavor}
                alreadyPurchased={itemPurchased}
                isCovered={coveredQty >= item.quantity_needed}
                shippingAddress={shippingAddress}
              />
            ) : (
              <>
                {item.external_url && !itemPurchased && (
                  <Button variant="outline" asChild>
                    <a
                      href={item.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        {store ? `Shop at ${store.name}` : "Shop"}
                      </span>
                    </a>
                  </Button>
                )}
                <ReserveItemDialog
                  item={item}
                  parentName={parentName}
                  registryStoreName={registryStoreName}
                  alreadyPurchased={itemPurchased}
                  shippingAddress={shippingAddress}
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
