"use client";

import { useState, type ReactNode } from "react";
import { Search, Store, Users } from "lucide-react";
import { TightSelect } from "@/components/ui/tight-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tag } from "@/components/ui/tag";
import { UsedConditionTag } from "@/components/ui/used-condition-tag";
import {
  ReserveItemDialog,
  type GiftActions as ReserveActions,
  type OpenGift,
} from "@/components/reserve-item-dialog";
import { ReservationBanner, type ReservationBannerEntry } from "@/components/reservation-banner";
import { formatReservedUntil, type MyItemGift } from "@/lib/gifts";
import { CoverItemDialog, type CoverActions } from "@/components/cover-item-dialog";
import { ContributeFundDialog } from "@/components/contribute-fund-dialog";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { ItemImage } from "@/components/item-image";
import { getCategorySectionId } from "@/lib/category-section-id";
import type { PaymentMethods } from "@/lib/types";
import { classifyStoreLink, detectStore, registryStoreFor, STORES, type StoreId } from "@/lib/retailers";
import { formatDollars, formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

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
  /** This visitor's own gifts, by item id. */
  myItemGifts?: Record<string, MyItemGift>;
  /** How many of each item other guests have reserved but not bought yet. */
  reservedCounts?: Record<string, number>;
  /**
   * For a guest of an everyone-gives-everyone event: by item id, the names of
   * the other guests who reserved it, so nobody doubles up. Never set on the
   * viewer's own list.
   */
  claims?: Record<string, string[]>;
  /** Opens one item's gift dialog on load, from a link in a guest's email. */
  openGift?: OpenGift;
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
  /** Stand-ins for the gift dialogs' server actions. The demo passes them. */
  actions?: GiftActions;
  /** The demo registry: the cover dialog's pay buttons don't open anything. */
  demo?: boolean;
}

/** Stand-ins for the gift dialogs' server actions, for the demo. */
export interface GiftActions {
  /** The reserve dialog's actions for one item. */
  reserve?: (itemId: string) => Partial<ReserveActions>;
  /** The cover dialog's actions for one item the owners already bought. */
  cover?: (itemId: string) => Partial<CoverActions>;
  /** The contribute dialog puts the fund's id in the form data as fundId. */
  contribute?: (formData: FormData) => Promise<{ error: string } | undefined>;
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
  myItemGifts = {},
  reservedCounts = {},
  claims,
  openGift,
  coverCounts,
  suggestButton,
  selfPurchasedLabel = "Purchased by parent",
  coverFlavor,
  linkedStores = [],
  showStoreRegistries = false,
  actions,
  demo = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [priceBucket, setPriceBucket] = useState("any");
  const [sort, setSort] = useState<SortMode>("default");
  const [storeFilter, setStoreFilter] = useState<StoreId | "any">("any");

  if (items.length === 0 && cashFunds.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center text-tertiary">
        <p>This registry doesn&apos;t have any items yet.</p>
        {suggestButton && <div className="max-sm:w-full">{suggestButton}</div>}
      </div>
    );
  }

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

  const showCategoryNav = navItems.length >= 1;

  // Reservations this visitor hasn't confirmed yet, for the banner.
  const openReservations: ReservationBannerEntry[] = items
    .filter((item) => !item.is_parent_purchased && myItemGifts[item.id]?.status === "reserved")
    .map((item) => ({
      item,
      gift: myItemGifts[item.id],
      storeName: classifyStoreLink(item.external_url)?.store.name,
      registryStoreName: showStoreRegistries
        ? registryStoreFor(item.external_url, linkedStores)?.name
        : undefined,
      actions: actions?.reserve?.(item.id),
    }));

  return (
    <div className="flex gap-8 items-start">
      {showCategoryNav && (
        <CategoryNav categories={navItems} suggestButton={suggestButton} />
      )}
      <div className="flex-1 min-w-0 space-y-10">
        {/* Always rendered: it keeps a finished reservation's dialog open
            after the page refreshes and the banner itself goes away. */}
        <ReservationBanner
          entries={openReservations}
          parentName={parentName}
          shippingAddress={shippingAddress}
          className=""
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items"
                aria-label="Search items"
                enterKeyHint="search"
                // 16px on phones, so iOS doesn't zoom in on focus.
                className="w-full rounded-md border border-primary bg-primary py-2 pl-9 pr-3 text-sm placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 max-sm:py-2.5 max-sm:text-md"
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
          {/* From lg up, the category sidebar shows "Suggest an item". Below lg
              the categories hide behind a floating button, so guests on phones
              find it here instead. With no sidebar, it's here at every width. */}
          {suggestButton && (
            <div className={cn("sm:self-start", showCategoryNav && "lg:hidden")}>
              {suggestButton}
            </div>
          )}
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
                                {formatDollars(fund.current_amount)} raised
                              </span>
                              <span>
                                {formatDollars(fund.goal_amount)} goal
                              </span>
                            </div>
                            <Progress value={fundProgress} aria-label={`Amount raised for ${fund.title}`} />
                            <span className="text-xs text-tertiary">
                              {formatDollars(Math.max(0, fund.goal_amount - fund.current_amount))} remaining
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
                          action={actions?.contribute}
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
                    myItemGift={myItemGifts[item.id]}
                    reservedQty={reservedCounts[item.id] || 0}
                    claimedBy={claims?.[item.id]}
                    openStep={openGift?.itemId === item.id ? openGift.step : undefined}
                    paymentMethods={paymentMethods}
                    parentName={parentName}
                    shippingAddress={shippingAddress}
                    selfPurchasedLabel={selfPurchasedLabel}
                    coverFlavor={coverFlavor}
                    linkedStores={linkedStores}
                    showStoreRegistries={showStoreRegistries}
                    actions={actions}
                    demo={demo}
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
                  myItemGift={myItemGifts[item.id]}
                  reservedQty={reservedCounts[item.id] || 0}
                  claimedBy={claims?.[item.id]}
                  openStep={openGift?.itemId === item.id ? openGift.step : undefined}
                  paymentMethods={paymentMethods}
                  parentName={parentName}
                  shippingAddress={shippingAddress}
                  selfPurchasedLabel={selfPurchasedLabel}
                  coverFlavor={coverFlavor}
                  linkedStores={linkedStores}
                  showStoreRegistries={showStoreRegistries}
                  actions={actions}
                  demo={demo}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** "Ann", "Ann and Bo", "Ann, Bo and Cy". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function PublicItemCard({
  item,
  categoryName,
  coverCounts,
  myGifts,
  myItemGift,
  reservedQty,
  claimedBy,
  openStep,
  paymentMethods,
  parentName,
  shippingAddress,
  selfPurchasedLabel = "Purchased by parent",
  coverFlavor,
  linkedStores,
  showStoreRegistries,
  actions,
  demo,
}: {
  item: RegistryItem;
  categoryName: string | null;
  coverCounts: Record<string, number>;
  myGifts: Props["myGifts"];
  myItemGift?: MyItemGift;
  reservedQty: number;
  claimedBy?: string[];
  openStep?: OpenGift["step"];
  paymentMethods?: PaymentMethods;
  parentName: string;
  shippingAddress?: string;
  selfPurchasedLabel?: string;
  coverFlavor?: string;
  linkedStores: StoreId[];
  showStoreRegistries: boolean;
  actions?: GiftActions;
  demo: boolean;
}) {
  const storeLink = classifyStoreLink(item.external_url);
  const store = storeLink?.store;
  const registryStoreName = showStoreRegistries
    ? registryStoreFor(item.external_url, linkedStores)?.name
    : undefined;
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;
  // Gifts go by what the server matched to this visitor. Covers saved before
  // the cookie held purchase ids left "cover" in it, which still counts.
  const itemPurchased = item.is_parent_purchased
    ? !!myItemGift || myGifts.items?.[item.id] === "cover"
    : myItemGift?.status === "purchased";
  const myReservation = !item.is_parent_purchased && myItemGift?.status === "reserved";
  const coveredQty = coverCounts[item.id] || 0;
  const availableToGift = item.is_parent_purchased
    ? item.quantity_needed - coveredQty
    : remaining;
  const isFullyCovered = item.is_parent_purchased && coveredQty >= item.quantity_needed;
  const looksDone = (isFulfilled && !item.is_parent_purchased && !myReservation) || isFullyCovered;

  return (
    <Card
      className={`py-0 gap-0 rounded-2xl shadow-none ${
        looksDone
          ? "border-tertiary"
          : item.is_parent_purchased
            ? "bg-mint-200/20 border-primary"
            : "border-primary"
      }`}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              {/* A fulfilled item fades its image, not the whole card, so its text keeps 4.5:1 contrast. */}
              <ItemImage
                imageUrl={item.image_url}
                title={item.title}
                categoryName={categoryName}
                className={looksDone ? "opacity-60" : ""}
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
                    {formatPrice(item.price)}
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
              {claimedBy && claimedBy.length > 0 && (
                <p className="flex items-start gap-1.5 text-xs font-medium text-brand-secondary">
                  <Users className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {`${myItemGift ? "Also reserved" : "Reserved"} by ${joinNames(claimedBy)}`}
                </p>
              )}
            </div>
          </div>
          {/* Tags sit below the image because the column beside it is too narrow for them in a three-column grid. */}
          <div className="flex w-full min-w-0 flex-wrap gap-2.5 empty:hidden">
            {item.is_parent_purchased ? (
              <Tag variant="parent-purchased">{selfPurchasedLabel}</Tag>
            ) : myReservation ? (
              <Tag variant="reserved">
                {/* One text node: the tag is a flex box, which would drop the space between pieces. */}
                <span suppressHydrationWarning>
                  {myItemGift?.reservedUntil
                    ? `Reserved for you · until ${formatReservedUntil(myItemGift.reservedUntil, "short")}`
                    : "Reserved for you"}
                </span>
              </Tag>
            ) : itemPurchased ? (
              <Tag variant="purchased-by-you">You gifted this</Tag>
            ) : isFulfilled ? (
              reservedQty > 0 ? (
                <Tag variant="reserved">Reserved by a guest</Tag>
              ) : (
                <Tag variant="gifted">Gifted</Tag>
              )
            ) : (
              item.is_essential && <Tag variant="most-wanted">Most wanted</Tag>
            )}
            {item.is_open_to_used && (
              <UsedConditionTag condition={item.minimum_condition} />
            )}
          </div>
        </div>

        {(item.is_parent_purchased
          ? availableToGift > 0 || !!myItemGift || openStep === "ended"
          : !isFulfilled || !!myItemGift || openStep === "ended") && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {item.is_parent_purchased ? (
              // Pay first, then say so: the gift is saved as given at once.
              <CoverItemDialog
                item={item}
                availableToGift={availableToGift}
                paymentMethods={paymentMethods}
                parentName={parentName}
                coverFlavor={coverFlavor}
                gift={myItemGift}
                initialStep={openStep}
                actions={actions?.cover?.(item.id)}
                demo={demo}
              />
            ) : (
              // One way in: the dialog takes the guest through reserving,
              // buying and confirming, with the store link in the Buy step.
              <ReserveItemDialog
                item={item}
                parentName={parentName}
                registryStoreName={registryStoreName}
                storeName={store?.name}
                gift={myItemGift}
                shippingAddress={shippingAddress}
                initialStep={openStep}
                actions={actions?.reserve?.(item.id)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
