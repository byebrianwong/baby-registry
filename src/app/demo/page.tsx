"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Baby,
  Calendar,
  ExternalLink,
  Package,
  Gift,
  Check,
  ArrowLeft,
  HandCoins,
  DollarSign,
  Lightbulb,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { PaymentMethodsDisplay } from "@/components/payment-methods-display";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { getCategorySectionId } from "@/lib/category-section-id";
import { ScrollToTop } from "@/components/scroll-to-top";
import {
  DEMO_REGISTRY,
  DEMO_CATEGORIES,
  DEMO_ITEMS,
  DEMO_CASH_FUNDS,
} from "@/lib/demo-data";

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

function DemoSuggestItemDialog() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSuccess(false);
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
                    leadingAddon={<InputPrefix>http://</InputPrefix>}
                    className="flex-1"
                  >
                    <InputBase
                      type="url"
                      placeholder="www.untitledui.com"
                    />
                  </InputGroup>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    title="Open link"
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
                  prefix="$"
                  trailingAddon={
                    <InputPrefix position="trailing">
                      <span className="relative inline-flex items-center">
                        <select className="appearance-none bg-transparent pr-5 text-primary outline-none cursor-pointer">
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
                placeholder="Jane Doe"
                isRequired
              />
              <Input
                label="Your Email"
                type="email"
                placeholder="jane@example.com"
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

function DemoReserveDialog({
  item,
  onReserve,
}: {
  item: DemoItem;
  onReserve: (itemId: string, quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reserved, setReserved] = useState(false);
  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReserve(item.id, 1);
    setReserved(true);
  };

  if (reserved) {
    return (
      <Button disabled variant="secondary">
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />Reserved</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <span className="inline-flex items-center gap-1.5"><Gift className="h-4 w-4 shrink-0" />Mark as purchased</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Mark &ldquo;{item.title}&rdquo; as purchased</DialogTitle>
          <DialogDescription>
            This is a demo — no actual reservation is made. In the real app,
            this notifies the parents and prevents duplicate gifts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            placeholder="Jane Doe"
            isRequired
          />
          <Input
            label="Your Email"
            type="email"
            placeholder="jane@example.com"
            icon={Mail01}
            isRequired
          />
          {item.quantity_needed > 1 && (
            <Input
              label="Quantity"
              type="number"
              min={1}
              max={remaining}
              placeholder="1"
              isRequired
              hint={`${remaining} of ${item.quantity_needed} still needed`}
            />
          )}
          <TextArea
            label="Message (optional)"
            placeholder="Congratulations!"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">I bought this item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DemoCoverItemDialog({
  item,
  onCover,
}: {
  item: DemoItem;
  onCover: (itemId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [covered, setCovered] = useState(false);
  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCover(item.id);
    setCovered(true);
  };

  if (covered) {
    return (
      <Button disabled variant="secondary">
        <span className="inline-flex items-center gap-1.5"><HandCoins className="h-4 w-4 shrink-0" />Covered</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <span className="inline-flex items-center gap-1.5"><HandCoins className="h-4 w-4 shrink-0" />Cover the cost</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Cover &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            This is a demo — no actual payment is made. The parents already
            bought this item. You can reimburse them via the payment methods
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 overflow-hidden rounded-xl px-4">
          {item.price && (
            <p className="text-lg font-semibold">${item.price.toFixed(2)}</p>
          )}
          <PaymentMethodsDisplay
            paymentMethods={DEMO_REGISTRY.settings.payment_methods}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            placeholder="Jane Doe"
            isRequired
          />
          <Input
            label="Your Email"
            type="email"
            placeholder="jane@example.com"
            icon={Mail01}
            isRequired
          />
          {item.quantity_needed > 1 && (
            <Input
              label="Quantity"
              type="number"
              min={1}
              max={remaining}
              placeholder="1"
              isRequired
              hint={`${remaining} of ${item.quantity_needed} still needed`}
            />
          )}
          <TextArea
            label="Message (optional)"
            placeholder="Congratulations!"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">I&apos;ll cover this</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DemoContributeFundDialog({
  fund,
  onContribute,
}: {
  fund: DemoCashFund;
  onContribute: (fundId: string, amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [contributed, setContributed] = useState(false);

  const remaining = Math.max(0, fund.goal_amount - fund.current_amount);
  const fundProgress =
    fund.goal_amount > 0
      ? (fund.current_amount / fund.goal_amount) * 100
      : 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string) || 25;
    onContribute(fund.id, amount);
    setContributed(true);
  };

  if (contributed) {
    return (
      <Button disabled variant="secondary">
        <span className="inline-flex items-center gap-1.5"><DollarSign className="h-4 w-4 shrink-0" />Contributed</span>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <span className="inline-flex items-center gap-1.5"><DollarSign className="h-4 w-4 shrink-0" />Contribute</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            Contribute to &ldquo;{fund.title}&rdquo;
          </DialogTitle>
          <DialogDescription>
            This is a demo — no actual payment is made. Pledge a contribution
            and send payment directly to the parents.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>${fund.current_amount} raised</span>
            <span>${fund.goal_amount} goal</span>
          </div>
          <Progress value={fundProgress} />
          {remaining > 0 && (
            <span className="text-xs">
              ${remaining} remaining
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 overflow-hidden rounded-xl px-4">
          <p className="text-lg font-semibold">${fund.goal_amount}</p>
          <PaymentMethodsDisplay
            paymentMethods={DEMO_REGISTRY.settings.payment_methods}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min={1}
            max={remaining}
            placeholder="0.00"
            isRequired
          />
          <Input
            label="Your Name"
            placeholder="Jane Doe"
            isRequired
          />
          <Input
            label="Your Email"
            type="email"
            placeholder="jane@example.com"
            icon={Mail01}
            isRequired
          />
          <TextArea
            label="Message (optional)"
            placeholder="Congratulations!"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Contribute</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DemoPage() {
  const [items, setItems] = useState(DEMO_ITEMS);
  const [funds, setFunds] = useState(DEMO_CASH_FUNDS);

  const handleReserve = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity_fulfilled: item.quantity_fulfilled + quantity,
            }
          : item
      )
    );
  };

  const handleCoverItem = (itemId: string) => {
    // In demo, just show the UI change — item stays parent-purchased
  };

  const handleContribute = (fundId: string, amount: number) => {
    setFunds((prev) =>
      prev.map((fund) =>
        fund.id === fundId
          ? { ...fund, current_amount: fund.current_amount + amount }
          : fund
      )
    );
  };

  const totalItems = items.length;
  const fulfilledItems = items.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress =
    totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;

  // Group items by category
  const itemsByCategory = new Map<string, DemoItem[]>();
  for (const item of items) {
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
            <Baby className="h-5 w-5 text-brand-600" />
            <span>Baby Akachan</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-3 w-3" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Registry Header */}
      <section className="border-b bg-secondary py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">
            {DEMO_REGISTRY.title}
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-tertiary">
            <Calendar className="h-4 w-4" />
            {new Date(DEMO_REGISTRY.event_date).toLocaleDateString(
              "en-US",
              {
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-tertiary">
            {DEMO_REGISTRY.description}
          </p>
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
        <div className="flex gap-8 items-start">
          {navItems.length > 1 && <CategoryNav categories={navItems} suggestButton={<DemoSuggestItemDialog />} />}
          <div className="flex-1 min-w-0 space-y-10">
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
                  <Card key={fund.id} className="py-0 gap-0 rounded-xl shadow-none">
                    <CardContent className="flex flex-col gap-4 p-4">
                      <h3 className="font-semibold text-2xl leading-8">
                        {fund.title}
                      </h3>
                      <p className="text-sm text-tertiary">
                        {fund.description}
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span>${fund.current_amount} raised</span>
                          <span>${fund.goal_amount} goal</span>
                        </div>
                        <Progress value={fundProgress} />
                        <span className="text-xs">
                          ${Math.max(0, fund.goal_amount - fund.current_amount)} remaining
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <DemoContributeFundDialog
                          fund={fund}
                          onContribute={handleContribute}
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

                    return (
                      <Card
                        key={item.id}
                        className={`py-0 gap-0 rounded-xl shadow-none ${
                          isFulfilled && !item.is_parent_purchased
                            ? "bg-secondary/50 border-secondary"
                            : item.is_parent_purchased
                              ? "bg-brand-600/10"
                              : ""
                        }`}
                      >
                        <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                          <div className="flex gap-3">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-secondary">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="h-16 w-16 rounded-md object-cover"
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
                                  <span className="inline-flex items-center rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
                                    Purchased by parent
                                  </span>
                                ) : isFulfilled ? (
                                  <span className="inline-flex items-center rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
                                    Already purchased by guest
                                  </span>
                                ) : (
                                  <>
                                    {item.is_essential && (
                                      <span className="inline-flex items-center rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
                                        Most wanted
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2.5">
                                {item.price && (
                                  <span className="text-sm font-semibold">
                                    ${item.price.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-xs">
                                  {remaining} of {item.quantity_needed} still needed
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-sm line-clamp-2">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {(item.is_parent_purchased || !isFulfilled) && (
                            <div className="flex items-center justify-end gap-2">
                              {item.is_parent_purchased ? (
                                <DemoCoverItemDialog
                                  item={item}
                                  onCover={handleCoverItem}
                                />
                              ) : (
                                <>
                                  <DemoReserveDialog
                                    item={item}
                                    onReserve={handleReserve}
                                  />
                                  {item.external_url && (
                                    <Button
                                      variant="outline"
                                      asChild
                                    >
                                      <a
                                        href={item.external_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <span className="inline-flex items-center gap-1.5"><ExternalLink className="h-4 w-4 shrink-0" />Shop</span>
                                      </a>
                                    </Button>
                                  )}
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
            Baby Akachan
          </Link>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
