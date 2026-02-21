"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Baby,
  ExternalLink,
  Settings,
  ClipboardList,
  Share2,
  Check,
  Plus,
  Trash2,
  Package,
  ArrowLeft,
  MessageSquare,
  Mail,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DEMO_REGISTRY,
  DEMO_CATEGORIES,
  DEMO_ITEMS,
  DEMO_PURCHASES,
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
  notes: string | null;
  sort_order: number;
}

function DemoAddItemDialog({
  categories,
  onAdd,
}: {
  categories: typeof DEMO_CATEGORIES;
  onAdd: (item: DemoItem) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const newItem: DemoItem = {
      id: `item-${Date.now()}`,
      title: formData.get("title") as string,
      category_id: formData.get("categoryId") as string,
      external_url: (formData.get("externalUrl") as string) || null,
      image_url: (formData.get("imageUrl") as string) || null,
      price: formData.get("price")
        ? parseFloat(formData.get("price") as string)
        : null,
      quantity_needed: parseInt(
        (formData.get("quantityNeeded") as string) || "1"
      ),
      quantity_fulfilled: 0,
      is_essential: formData.get("isEssential") === "on",
      notes: (formData.get("notes") as string) || null,
      sort_order: 0,
    };

    onAdd(newItem);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Item to Registry</DialogTitle>
          <DialogDescription>
            This is a demo — the item will be added to the local list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Item Name</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Convertible Crib"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={categories[0].id}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="externalUrl">Product URL (optional)</Label>
            <Input
              id="externalUrl"
              name="externalUrl"
              type="url"
              placeholder="https://www.amazon.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantityNeeded">Quantity</Label>
              <Input
                id="quantityNeeded"
                name="quantityNeeded"
                type="number"
                min="1"
                defaultValue="1"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isEssential" name="isEssential" />
            <Label htmlFor="isEssential" className="text-sm font-normal">
              Mark as essential item
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any preferences for color, brand, etc."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DemoItemCard({
  item,
  onDelete,
}: {
  item: DemoItem;
  onDelete: (id: string) => void;
}) {
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;

  return (
    <Card className={isFulfilled ? "opacity-60" : ""}>
      <CardContent className="flex gap-4 p-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-muted">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium leading-tight">
                {item.title}
                {isFulfilled && (
                  <Badge variant="secondary" className="ml-2">
                    Fulfilled
                  </Badge>
                )}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                {item.is_essential && (
                  <Badge variant="default" className="text-xs">
                    Essential
                  </Badge>
                )}
                {item.price && (
                  <span className="text-sm text-muted-foreground">
                    ${item.price.toFixed(2)}
                  </span>
                )}
                {item.quantity_needed > 1 && (
                  <span className="text-sm text-muted-foreground">
                    {remaining} of {item.quantity_needed} needed
                  </span>
                )}
              </div>
            </div>
          </div>

          {item.notes && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {item.notes}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            {item.external_url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  View
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type TabMode = "items" | "purchases";

export default function DemoManagePage() {
  const [items, setItems] = useState<DemoItem[]>(DEMO_ITEMS);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>("items");

  const handleAddItem = (item: DemoItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/demo`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalItems = items.length;
  const fulfilledItems = items.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress =
    totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;
  const totalValue = items.reduce(
    (sum, i) => sum + (i.price || 0),
    0
  );

  // Group items by category
  const itemsByCategory = new Map<string, DemoItem[]>();
  for (const item of items) {
    if (!itemsByCategory.has(item.category_id)) {
      itemsByCategory.set(item.category_id, []);
    }
    itemsByCategory.get(item.category_id)!.push(item);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm">
        This is a demo — changes are local and won&apos;t be saved.{" "}
        <Link href="/signup" className="underline font-medium">
          Create your own registry
        </Link>
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            href="/demo/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Baby className="h-5 w-5 text-primary" />
            <span>Baby Akachan</span>
          </Link>
          <span className="ml-4 text-sm text-muted-foreground hidden md:inline">
            demo@example.com
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/demo/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold">
                  {DEMO_REGISTRY.title}
                </h1>
              </div>
              <p className="text-muted-foreground ml-10">
                Due date:{" "}
                {new Date(
                  DEMO_REGISTRY.event_date
                ).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Link
                  </>
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/demo" target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/demo/checklist">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Checklist
                </Link>
              </Button>
              <Button variant="outline" disabled>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Fulfilled
                </p>
                <p className="text-2xl font-bold">{fulfilledItems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Completion
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {Math.round(progress)}%
                  </p>
                  <Progress value={progress} className="flex-1" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold">
                  ${totalValue.toFixed(0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-8" />

          {/* Tabs */}
          <div className="flex items-center gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab("items")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "items"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Items ({totalItems})
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "purchases"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Gift Activity ({DEMO_PURCHASES.length})
            </button>
          </div>

          {activeTab === "items" ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Registry Items</h2>
                <DemoAddItemDialog
                  categories={DEMO_CATEGORIES}
                  onAdd={handleAddItem}
                />
              </div>

              <div className="space-y-8">
                {DEMO_CATEGORIES.map((category) => {
                  const categoryItems =
                    itemsByCategory.get(category.id) || [];
                  if (categoryItems.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        {category.name}
                        <Badge variant="secondary">
                          {categoryItems.length}
                        </Badge>
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {categoryItems.map((item) => (
                          <DemoItemCard
                            key={item.id}
                            item={item}
                            onDelete={handleDeleteItem}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Gift Activity</h2>
                <p className="text-sm text-muted-foreground">
                  See who has reserved items and contributed to funds
                </p>
              </div>

              <div className="space-y-3">
                {DEMO_PURCHASES
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((purchase) => (
                  <Card key={purchase.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {purchase.buyer_name}
                            </span>
                            <Badge
                              variant={
                                purchase.cash_fund_id
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {purchase.cash_fund_id
                                ? "Contribution"
                                : "Reserved"}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">
                            {purchase.cash_fund_id ? (
                              <>
                                <DollarSign className="inline h-3 w-3 mr-1" />
                                Contributed{" "}
                                <span className="font-medium">
                                  ${purchase.amount}
                                </span>{" "}
                                to{" "}
                                <span className="font-medium">
                                  {purchase.item_title}
                                </span>
                              </>
                            ) : (
                              <>
                                Reserved{" "}
                                {purchase.quantity > 1 && (
                                  <span>{purchase.quantity}x </span>
                                )}
                                <span className="font-medium">
                                  {purchase.item_title}
                                </span>
                              </>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {purchase.buyer_email}
                            </span>
                            <span>
                              {new Date(
                                purchase.created_at
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {purchase.message && (
                            <p className="mt-2 text-sm text-muted-foreground flex items-start gap-1">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              &ldquo;{purchase.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
