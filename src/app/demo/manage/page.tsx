"use client";

import React, { useState } from "react";
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
  ShoppingBag,
  Undo2,
  X,
  FolderOpen,
  Pencil,
  Loader2,
  Link as LinkIcon,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  is_parent_purchased: boolean;
  notes: string | null;
  sort_order: number;
}

interface DemoPurchase {
  id: string;
  registry_item_id: string | null;
  cash_fund_id: string | null;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  amount: number | null;
  status: string;
  message: string | null;
  created_at: string;
  item_title: string;
}

function DemoAddItemDialog({
  categories,
  onAdd,
}: {
  categories: { id: string; name: string }[];
  onAdd: (item: DemoItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const titleRef = React.useRef<HTMLInputElement>(null);
  const priceRef = React.useRef<HTMLInputElement>(null);
  const imageUrlRef = React.useRef<HTMLInputElement>(null);

  const handleDemoScrape = async (url: string) => {
    if (!url || scraping) return;
    try { new URL(url); } catch { return; }

    setScraping(true);
    setScrapeStatus("");

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));

    const mockData = {
      title: "4moms MamaRoo Multi-Motion Baby Swing",
      price: "219.99",
      imageUrl: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&h=300&fit=crop",
    };

    const filled: string[] = [];
    if (titleRef.current && !titleRef.current.value) {
      titleRef.current.value = mockData.title;
      filled.push("title");
    }
    if (priceRef.current && !priceRef.current.value) {
      priceRef.current.value = mockData.price;
      filled.push("price");
    }
    if (imageUrlRef.current && !imageUrlRef.current.value) {
      imageUrlRef.current.value = mockData.imageUrl;
      filled.push("image");
    }

    setScrapeStatus(
      filled.length > 0
        ? `Auto-filled ${filled.join(", ")}`
        : "No new data found to fill"
    );
    setScraping(false);
  };

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
      is_parent_purchased: false,
      notes: (formData.get("notes") as string) || null,
      sort_order: 0,
    };

    onAdd(newItem);
    setOpen(false);
    setScrapeStatus("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setScrapeStatus(""); }}>
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
            This is a demo — paste a URL to see auto-fill in action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalUrl">Product URL</Label>
            <div className="flex gap-2">
              <Input
                id="externalUrl"
                name="externalUrl"
                type="url"
                placeholder="https://www.amazon.com/..."
                onBlur={(e) => handleDemoScrape(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={scraping}
                onClick={() => {
                  const input = document.getElementById("externalUrl") as HTMLInputElement;
                  if (input?.value) handleDemoScrape(input.value);
                }}
                title="Fetch product details"
              >
                {scraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {scrapeStatus && (
              <p className="text-xs text-muted-foreground">{scrapeStatus}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Item Name</Label>
            <Input
              id="title"
              name="title"
              ref={titleRef}
              placeholder="e.g., Convertible Crib"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={categories[0]?.id}>
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
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              ref={imageUrlRef}
              type="url"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                name="price"
                ref={priceRef}
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
  onToggleParentPurchased,
}: {
  item: DemoItem;
  onDelete: (id: string) => void;
  onToggleParentPurchased: (id: string) => void;
}) {
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;

  return (
    <Card
      className={
        isFulfilled && !item.is_parent_purchased
          ? "opacity-60"
          : item.is_parent_purchased
            ? "border-brand-600/30 bg-brand-600/5"
            : ""
      }
    >
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
                {item.is_parent_purchased && (
                  <Badge
                    variant="outline"
                    className="ml-2 border-brand-600/50 text-brand-600"
                  >
                    You bought this
                  </Badge>
                )}
                {isFulfilled && !item.is_parent_purchased && (
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
                {item.quantity_needed > 1 && !isFulfilled && (
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
            {!isFulfilled && !item.is_parent_purchased && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleParentPurchased(item.id)}
              >
                <ShoppingBag className="mr-1 h-3 w-3" />
                I Bought This
              </Button>
            )}
            {item.is_parent_purchased && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleParentPurchased(item.id)}
              >
                <Undo2 className="mr-1 h-3 w-3" />
                Undo
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

function DemoCategoryManager({
  categories,
  onAdd,
  onRename,
  onDelete,
}: {
  categories: { id: string; name: string; sort_order: number }[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    onRename(id, editName.trim());
    setEditingId(null);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen className="mr-2 h-4 w-4" />
          Categories
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Manage Categories</SheetTitle>
          <SheetDescription>
            This is a demo — changes are local only.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              {editingId === cat.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdate(cat.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditName(cat.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(cat.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 pt-4 border-t">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type TabMode = "items" | "purchases";

export default function DemoManagePage() {
  const [items, setItems] = useState<DemoItem[]>(DEMO_ITEMS);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [purchases, setPurchases] = useState<DemoPurchase[]>(DEMO_PURCHASES);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>("items");

  const handleAddItem = (item: DemoItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleParentPurchased = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              is_parent_purchased: !item.is_parent_purchased,
              quantity_fulfilled: !item.is_parent_purchased
                ? item.quantity_needed
                : 0,
            }
          : item
      )
    );
  };

  const handleAddCategory = (name: string) => {
    setCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        name,
        sort_order: prev.length,
      },
    ]);
  };

  const handleRenameCategory = (id: string, name: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
    );
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const handleCancelPurchase = (purchaseId: string) => {
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === purchaseId ? { ...p, status: "cancelled" } : p
      )
    );
    // Restore item quantity
    const purchase = purchases.find((p) => p.id === purchaseId);
    if (purchase?.registry_item_id) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === purchase.registry_item_id
            ? {
                ...item,
                quantity_fulfilled: Math.max(
                  0,
                  item.quantity_fulfilled - purchase.quantity
                ),
              }
            : item
        )
      );
    }
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

  const activePurchases = purchases.filter((p) => p.status !== "cancelled");

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
                  ? "border-brand-600 text-primary"
                  : "border-transparent text-tertiary hover:text-primary"
              }`}
            >
              Items ({totalItems})
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "purchases"
                  ? "border-brand-600 text-primary"
                  : "border-transparent text-tertiary hover:text-primary"
              }`}
            >
              Gift Activity ({purchases.length})
            </button>
          </div>

          {activeTab === "items" ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Registry Items</h2>
                <div className="flex gap-2">
                  <DemoCategoryManager
                    categories={categories}
                    onAdd={handleAddCategory}
                    onRename={handleRenameCategory}
                    onDelete={handleDeleteCategory}
                  />
                  <DemoAddItemDialog
                    categories={categories}
                    onAdd={handleAddItem}
                  />
                </div>
              </div>

              <div className="space-y-8">
                {categories.map((category) => {
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
                            onToggleParentPurchased={
                              handleToggleParentPurchased
                            }
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
                {purchases
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .map((purchase) => {
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
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Cancelled
                                  </Badge>
                                ) : (
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
                                )}
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
                                      <span>
                                        {purchase.quantity}x{" "}
                                      </span>
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
                            {!isCancelled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCancelPurchase(purchase.id)
                                }
                                className="text-destructive hover:text-destructive shrink-0"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
