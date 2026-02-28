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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentMethodsDisplay } from "@/components/payment-methods-display";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            This is a demo — no actual reservation is made. In the real app,
            this notifies the parents and prevents duplicate gifts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            placeholder="Jane Doe"
            defaultValue="Demo User"
            isRequired
          />
          <Input
            label="Your Email"
            type="email"
            placeholder="jane@example.com"
            defaultValue="demo@example.com"
            isRequired
          />
          {remaining > 1 && (
            <Input
              label={`Quantity (up to ${remaining})`}
              type="number"
              min={1}
              max={remaining}
              defaultValue="1"
            />
          )}
          <TextArea
            label="Message (optional)"
            placeholder="Congratulations!"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Reserve Item</Button>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cover &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            This is a demo — no actual payment is made. The parents already
            bought this item. You can reimburse them via the payment methods
            below.
          </DialogDescription>
        </DialogHeader>

        {item.price && (
          <p className="text-lg font-semibold">${item.price.toFixed(2)}</p>
        )}

        <PaymentMethodsDisplay
          paymentMethods={DEMO_REGISTRY.settings.payment_methods}
        />

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            defaultValue="Demo User"
            isRequired
          />
          <Input
            label="Your Email"
            type="email"
            defaultValue="demo@example.com"
            isRequired
          />
          <TextArea
            label="Message (optional)"
            placeholder="Happy to help!"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">I&apos;ll Cover This</Button>
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
      <Button size="sm" disabled variant="secondary">
        <DollarSign className="mr-1 h-3 w-3" />
        Contributed
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <DollarSign className="mr-1 h-3 w-3" />
          Contribute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Contribute to &ldquo;{fund.title}&rdquo;
          </DialogTitle>
          <DialogDescription>
            This is a demo — no actual payment is made. Pledge a contribution
            and send payment directly to the parents.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>${fund.current_amount} raised</span>
            <span>${fund.goal_amount} goal</span>
          </div>
          <Progress value={fundProgress} />
          {remaining > 0 && (
            <p className="text-xs text-tertiary mt-1">
              ${remaining} remaining
            </p>
          )}
        </div>

        <PaymentMethodsDisplay
          paymentMethods={DEMO_REGISTRY.settings.payment_methods}
        />

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Amount ($)"
            name="amount"
            type="number"
            step="0.01"
            min={1}
            max={remaining}
            placeholder="25.00"
            isRequired
          />
          <Input
            label="Your Name"
            defaultValue="Demo User"
            isRequired
          />
          <Input
            label="Your Email"
            type="email"
            defaultValue="demo@example.com"
            isRequired
          />
          <TextArea
            label="Message (optional)"
            placeholder="Congratulations!"
            rows={2}
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
        <div className="space-y-10">
          {/* Cash Funds */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Gift Funds</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {funds.map((fund) => {
                const fundProgress =
                  fund.goal_amount > 0
                    ? (fund.current_amount / fund.goal_amount) * 100
                    : 0;
                return (
                  <Card key={fund.id}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg">
                        {fund.title}
                      </h3>
                      <p className="mt-1 text-sm text-tertiary">
                        {fund.description}
                      </p>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>${fund.current_amount} raised</span>
                          <span>${fund.goal_amount} goal</span>
                        </div>
                        <Progress value={fundProgress} />
                      </div>
                      <div className="mt-4">
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
                        className={`py-0 gap-0 rounded-xl shadow-none ${
                          isFulfilled && !item.is_parent_purchased
                            ? "bg-secondary/50 border-secondary"
                            : item.is_parent_purchased
                              ? "bg-brand-600/10"
                              : ""
                        }`}
                      >
                        <CardContent className="flex h-full flex-col justify-between gap-2 p-4">
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
                                        <span className="inline-flex items-center gap-1.5"><ExternalLink className="h-4 w-4 shrink-0" />Cancel</span>
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
    </div>
  );
}
