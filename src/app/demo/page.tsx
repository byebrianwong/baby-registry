"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Baby,
  Calendar,
  ArrowLeft,
  Lightbulb,
  ChevronDown,
  Search,
  LockOpen,
} from "lucide-react";
import { ItemImage } from "@/components/item-image";
import { RegistryAvatar } from "@/components/registry-avatar";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/tag";
import { TightSelect } from "@/components/ui/tight-select";
import { UsedConditionTag } from "@/components/ui/used-condition-tag";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link01, Mail01 } from "@untitledui/icons";
import { Input, InputBase } from "@/components/base/input/input";
import { InputGroup, InputPrefix } from "@/components/base/input/input-group";
import { Label } from "@/components/base/input/label";
import { TextArea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Select } from "@/components/base/select/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReserveItemDialog, type GiftActions } from "@/components/reserve-item-dialog";
import { ReservationBanner } from "@/components/reservation-banner";
import { GIFT_HOLD_DAYS, formatReservedUntil, type MyItemGift } from "@/lib/gifts";
import { classifyStoreLink } from "@/lib/retailers";
import { CoverItemDialog, type CoverActions } from "@/components/cover-item-dialog";
import { ContributeFundDialog } from "@/components/contribute-fund-dialog";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { getCategorySectionId } from "@/lib/category-section-id";
import { ScrollToTop } from "@/components/scroll-to-top";
import {
  DEMO_REGISTRY,
  DEMO_CATEGORIES,
  DEMO_ITEMS,
  DEMO_CASH_FUNDS,
  demoDueDate,
} from "@/lib/demo-data";
import { useDemoToday } from "./demo-today";
import { toWebUrl } from "@/lib/web-url";
import { Logo } from "@/components/logo";
import { formatDollars, formatPrice } from "@/lib/money";

interface DemoItem {
  id: string;
  title: string;
  category_id: string;
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
  sort_order: number;
}

interface DemoCashFund {
  id: string;
  title: string;
  description: string | null;
  goal_amount: number;
  current_amount: number;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

function DemoSuggestItemDialog() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [externalUrl, setExternalUrl] = useState("");
  const openableUrl = toWebUrl(externalUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSuccess(false);
      setCurrency("USD");
      setExternalUrl("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          <span className="inline-flex items-center gap-2">
            <Lightbulb className="h-5 w-5 shrink-0" />
            Suggest an item
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Thank you!</DialogTitle>
              <DialogDescription>
                Your suggestion has been sent to the parents. They&apos;ll
                review it and decide whether to add it to their registry.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Suggest an item</DialogTitle>
              <DialogDescription>
                Know something the parents might love? Suggest it here and
                they&apos;ll be notified.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Item Name"
                placeholder="e.g. Baby Monitor"
                isRequired
              />

              <Checkbox
                value="true"
                label="Mark as available to gift"
              />

              <div className="space-y-1.5">
                <Label>Product URL (optional)</Label>
                <div className="flex items-center gap-4">
                  <InputGroup
                    aria-label="Product URL (optional)"
                    leadingAddon={<InputPrefix>http://</InputPrefix>}
                    onChange={setExternalUrl}
                    className="flex-1"
                  >
                    <InputBase
                      type="url"
                      placeholder="www.target.com/..."
                    />
                  </InputGroup>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Open link in a new tab"
                    disabled={!openableUrl}
                    onClick={() => {
                      if (openableUrl) window.open(openableUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Link01 className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <Select
                label="Category"
                placeholder="Select a category"
                items={DEMO_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.name }))}
              >
                {(item) => <Select.Item id={item.id} label={item.label} />}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="Estimated price (optional)"
                  prefix={currencySymbols[currency] || "$"}
                  trailingAddon={
                    <InputPrefix position="trailing">
                      <span className="relative inline-flex items-center">
                        <select
                          aria-label="Currency"
                          className="appearance-none bg-transparent pr-5 text-primary outline-none cursor-pointer"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                        >
                          <option>USD</option>
                          <option>EUR</option>
                          <option>GBP</option>
                          <option>JPY</option>
                          <option>CAD</option>
                          <option>AUD</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-tertiary" />
                      </span>
                    </InputPrefix>
                  }
                >
                  <InputBase
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                  />
                </InputGroup>
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  defaultValue="1"
                />
              </div>

              <TextArea
                label="Why do you recommend this? (optional)"
                placeholder="Enter a description..."
                rows={3}
              />

              <Input
                label="Your Name"
                placeholder="Alex Kim"
                isRequired
              />
              <Input
                label="Your Email"
                type="email"
                placeholder="alex@example.com"
                icon={Mail01}
                isRequired
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Suggest item</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const DEMO_PARENT_NAME = "Remi & Max";
const DEMO_SHIPPING_ADDRESS = DEMO_REGISTRY.settings.shipping_address;

type SortMode = "default" | "most-wanted" | "price-asc" | "price-desc";
const PRICE_BUCKETS = [
  { value: "any", label: "Any price", max: Infinity },
  { value: "25", label: "Under $25", max: 25 },
  { value: "50", label: "Under $50", max: 50 },
  { value: "100", label: "Under $100", max: 100 },
  { value: "250", label: "Under $250", max: 250 },
];

export default function DemoPage() {
  const today = useDemoToday();
  const [items, setItems] = useState(DEMO_ITEMS);
  const [funds, setFunds] = useState(DEMO_CASH_FUNDS);
  const [search, setSearch] = useState("");
  const [priceBucket, setPriceBucket] = useState("any");
  const [sort, setSort] = useState<SortMode>("default");

  // The demo keeps gifts in memory, the way the live site keeps them in a
  // cookie and the database.
  const [demoGifts, setDemoGifts] = useState<Record<string, MyItemGift>>({});

  const addToFulfilled = (itemId: string, change: number) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity_fulfilled: Math.max(0, item.quantity_fulfilled + change) }
          : item
      )
    );

  const demoGiftActions = (itemId: string): GiftActions => ({
    reserve: async (formData: FormData) => {
      const quantity = parseInt(formData.get("quantity") as string) || 1;
      const bought = formData.get("alreadyBought") === "1";
      const gift: MyItemGift = {
        purchaseId: `demo-${itemId}`,
        status: bought ? "purchased" : "reserved",
        reservedUntil: bought
          ? null
          : new Date(Date.now() + GIFT_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        quantity,
      };
      addToFulfilled(itemId, quantity);
      setDemoGifts((prev) => ({ ...prev, [itemId]: gift }));
      return { success: true, ...gift, shippingAddress: DEMO_SHIPPING_ADDRESS };
    },
    confirm: async () => {
      setDemoGifts((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], status: "purchased", reservedUntil: null },
      }));
      return {};
    },
    release: async () => {
      const gift = demoGifts[itemId];
      if (gift) addToFulfilled(itemId, -gift.quantity);
      setDemoGifts((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return {};
    },
  });

  // The visitor's gifts of items the owners already bought, by item id.
  const [demoCoverGifts, setDemoCoverGifts] = useState<Record<string, MyItemGift>>({});

  const demoCoverActions = (itemId: string): CoverActions => ({
    give: async (formData: FormData) => {
      const quantity = parseInt(formData.get("quantity") as string) || 1;
      const purchaseId = `demo-cover-${itemId}`;
      setDemoCoverGifts((prev) => ({
        ...prev,
        [itemId]: { purchaseId, status: "purchased", reservedUntil: null, quantity },
      }));
      return { success: true, purchaseId };
    },
    release: async () => {
      setDemoCoverGifts((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return {};
    },
  });

  const demoContributeAction = (fundId: string) => async (formData: FormData) => {
    const amount = parseFloat(formData.get("amount") as string) || 25;
    setFunds((prev) =>
      prev.map((fund) =>
        fund.id === fundId
          ? { ...fund, current_amount: fund.current_amount + amount }
          : fund
      )
    );
    return undefined;
  };

  const totalItems = items.length;
  const fulfilledItems = items.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress =
    totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;

  // Apply search + price filter + sort
  const normalizedQuery = search.trim().toLowerCase();
  const priceMax =
    PRICE_BUCKETS.find((b) => b.value === priceBucket)?.max ?? Infinity;
  const filteredItems = items.filter((item) => {
    if (normalizedQuery) {
      const haystack = `${item.title} ${item.notes ?? ""}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    if (priceMax !== Infinity && (item.price ?? Infinity) > priceMax) return false;
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
        return a.sort_order - b.sort_order;
    }
  });
  const filtersActive =
    normalizedQuery !== "" || priceBucket !== "any" || sort !== "default";

  // Group items by category
  const itemsByCategory = new Map<string, DemoItem[]>();
  for (const item of sortedItems) {
    if (!itemsByCategory.has(item.category_id)) {
      itemsByCategory.set(item.category_id, []);
    }
    itemsByCategory.get(item.category_id)!.push(item);
  }

  // Build navigation items for category sidebar
  const navItems: CategoryNavItem[] = [];
  if (funds.length > 0) {
    navItems.push({
      id: getCategorySectionId("gift-funds"),
      name: "Gift Funds",
      count: funds.length,
    });
  }
  for (const category of DEMO_CATEGORIES) {
    const categoryItems = itemsByCategory.get(category.id) || [];
    if (categoryItems.length > 0) {
      navItems.push({
        id: getCategorySectionId(category.id),
        name: category.name,
        count: categoryItems.length,
      });
    }
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Demo banner */}
      <div className="bg-brand-solid text-white py-2 px-4 text-center text-sm">
        This is a demo registry — no account or database required.{" "}
        <Link href="/signup" className="underline font-medium">
          Create your own registry
        </Link>
      </div>

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
          >
            <Logo />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3 w-3 shrink-0" />
                Back to Home
              </span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Registry Header */}
      <section className="border-b bg-secondary py-12">
        <div className="container mx-auto px-4 text-center">
          <RegistryAvatar names={DEMO_REGISTRY.honoree_names} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold sm:text-4xl">
            {DEMO_REGISTRY.title}
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-tertiary">
            <Calendar className="h-4 w-4" />
            {new Date(`${demoDueDate(today)}T00:00:00`).toLocaleDateString(
              "en-US",
              {
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-tertiary whitespace-pre-line">
            {DEMO_REGISTRY.description}
          </p>
          <div className="mx-auto mt-6 max-w-xs">
            <div className="flex justify-between text-sm mb-1">
              <span>
                {fulfilledItems} of {totalItems} gifts fulfilled
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} aria-label="Gifts fulfilled" />
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-tertiary">
            <LockOpen className="h-3.5 w-3.5" />
            Reserve a gift in 10 seconds — no sign-up required.
          </p>
        </div>
      </section>

      {/* Items */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-8 items-start">
          {navItems.length > 1 && <CategoryNav categories={navItems} suggestButton={<DemoSuggestItemDialog />} />}
          <div className="flex-1 min-w-0 space-y-10">
          <ReservationBanner
            entries={items
              .filter((item) => demoGifts[item.id]?.status === "reserved")
              .map((item) => ({
                item,
                gift: demoGifts[item.id],
                storeName: classifyStoreLink(item.external_url)?.store.name,
                actions: demoGiftActions(item.id),
              }))}
            parentName={DEMO_PARENT_NAME}
            shippingAddress={DEMO_SHIPPING_ADDRESS}
            className=""
          />
          {/* Toolbar: search + price + sort */}
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
            <div className="flex items-center gap-2">
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
                options={[
                  { value: "default", label: "Default order" },
                  { value: "most-wanted", label: "Most wanted first" },
                  { value: "price-asc", label: "Price: low to high" },
                  { value: "price-desc", label: "Price: high to low" },
                ]}
              />
            </div>
          </div>
          {filtersActive && filteredItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-primary bg-secondary p-8 text-center text-sm text-tertiary">
              No items match your filters.{" "}
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPriceBucket("any");
                  setSort("default");
                }}
                className="font-medium text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
          {/* Cash Funds */}
          <div id={getCategorySectionId("gift-funds")} className="scroll-mt-4">
            <h2 className="text-xl font-semibold mb-4">Gift Funds</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {funds.map((fund) => {
                const fundProgress =
                  fund.goal_amount > 0
                    ? (fund.current_amount / fund.goal_amount) * 100
                    : 0;
                return (
                  <Card key={fund.id} className="py-0 gap-0 rounded-2xl shadow-none">
                    <CardContent className="flex flex-col gap-4 p-4">
                      <h3 className="font-display font-semibold text-2xl leading-8">
                        {fund.title}
                      </h3>
                      <p className="text-sm text-tertiary whitespace-pre-line">
                        {fund.description}
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span>{formatDollars(fund.current_amount)} raised</span>
                          <span>{formatDollars(fund.goal_amount)} goal</span>
                        </div>
                        <Progress value={fundProgress} aria-label={`Amount raised for ${fund.title}`} />
                        <span className="text-xs">
                          {formatDollars(Math.max(0, fund.goal_amount - fund.current_amount))} remaining
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <ContributeFundDialog
                          fund={fund}
                          paymentMethods={DEMO_REGISTRY.settings.payment_methods}
                          parentName={DEMO_PARENT_NAME}
                          action={demoContributeAction(fund.id)}
                          shippingAddress={DEMO_SHIPPING_ADDRESS}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Separator className="mt-10" />
          </div>

          {/* Items by category */}
          {DEMO_CATEGORIES.map((category) => {
            const categoryItems =
              itemsByCategory.get(category.id) || [];
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
                    const myCover = item.is_parent_purchased ? demoCoverGifts[item.id] : undefined;
                    const availableToGift = item.is_parent_purchased
                      ? item.quantity_needed - (myCover?.quantity || 0)
                      : remaining;
                    const myGift = item.is_parent_purchased ? undefined : demoGifts[item.id];
                    const looksDone = isFulfilled && !item.is_parent_purchased && myGift?.status !== "reserved";

                    return (
                      <Card
                        key={item.id}
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
                              {/* A fulfilled item fades its image, not the whole card, so its text keeps 4.5:1 contrast. */}
                              <ItemImage
                                imageUrl={item.image_url}
                                title={item.title}
                                categoryName={category.name}
                                className={isFulfilled && !item.is_parent_purchased ? "opacity-60" : ""}
                              />
                              <div className="flex-1 min-w-0 flex flex-col gap-2 items-start">
                                <h3 className="font-medium text-sm leading-tight">
                                  {item.title}
                                </h3>
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
                                {item.notes && (
                                  <p className="text-sm text-secondary whitespace-pre-line">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Tags sit below the image because the column beside it is too narrow for them in a three-column grid. */}
                            <div className="flex flex-wrap gap-2.5 empty:hidden">
                              {item.is_parent_purchased ? (
                                <Tag variant="parent-purchased">Purchased by parent</Tag>
                              ) : myGift?.status === "reserved" ? (
                                <Tag variant="reserved">
                                  {myGift.reservedUntil
                                    ? `Reserved for you · until ${formatReservedUntil(myGift.reservedUntil, "short")}`
                                    : "Reserved for you"}
                                </Tag>
                              ) : myGift ? (
                                <Tag variant="purchased-by-you">You gifted this</Tag>
                              ) : isFulfilled ? (
                                <Tag variant="gifted">Gifted</Tag>
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
                          </div>

                          {(item.is_parent_purchased ? availableToGift > 0 || !!myCover : !isFulfilled || !!myGift) && (
                            <div className="flex items-center justify-end gap-2">
                              {item.is_parent_purchased ? (
                                <CoverItemDialog
                                  item={item}
                                  availableToGift={availableToGift}
                                  paymentMethods={DEMO_REGISTRY.settings.payment_methods}
                                  parentName={DEMO_PARENT_NAME}
                                  gift={myCover}
                                  actions={demoCoverActions(item.id)}
                                  demo
                                />
                              ) : (
                                <ReserveItemDialog
                                  item={item}
                                  parentName={DEMO_PARENT_NAME}
                                  storeName={classifyStoreLink(item.external_url)?.store.name}
                                  gift={myGift}
                                  actions={demoGiftActions(item.id)}
                                  shippingAddress={myGift ? DEMO_SHIPPING_ADDRESS : undefined}
                                />
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
          </div>
        </div>
      </main>

      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-tertiary">
          Powered by{" "}
          <Link
            href="/"
            className="font-medium text-brand-600 hover:underline"
          >
            Regibee
          </Link>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
