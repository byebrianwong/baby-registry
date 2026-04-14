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
  ShoppingBag,
  Undo2,
  X,
  FolderOpen,
  Pencil,
  Loader2,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import { Link01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/tag";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
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
  DEMO_SUGGESTIONS,
} from "@/lib/demo-data";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";
import { CategoryNav, type CategoryNavItem } from "@/components/category-nav";
import { getCategorySectionId } from "@/lib/category-section-id";
import { ScrollToTop } from "@/components/scroll-to-top";

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

interface DemoSuggestion {
  id: string;
  title: string;
  external_url: string | null;
  price: number | null;
  notes: string | null;
  suggested_by_name: string;
  suggested_by_email: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

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
  const [openToUsed, setOpenToUsed] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const urlRef = React.useRef<HTMLInputElement>(null);
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
      is_essential: formData.get("isEssential") === "true",
      is_parent_purchased: false,
      notes: (formData.get("notes") as string) || null,
      sort_order: 0,
    };

    onAdd(newItem);
    setOpen(false);
    setScrapeStatus("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setScrapeStatus(""); setOpenToUsed(false); setCurrency("USD"); } }}>
      <DialogTrigger asChild>
        <Button className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4 shrink-0" />
            Add Item
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add item to registry</DialogTitle>
          <DialogDescription>
            This is a demo — paste a URL to see auto-fill in action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product URL</Label>
            <div className="flex items-center gap-4">
              <InputGroup
                leadingAddon={<InputPrefix>http://</InputPrefix>}
                className="flex-1"
              >
                <InputBase
                  ref={urlRef}
                  name="externalUrl"
                  type="url"
                  placeholder="www.untitledui.com"
                  onBlur={(e) => handleDemoScrape((e.target as HTMLInputElement).value)}
                />
              </InputGroup>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                disabled={scraping}
                onClick={() => {
                  if (urlRef.current?.value) handleDemoScrape(urlRef.current.value);
                }}
                title="Fetch product details"
              >
                {scraping ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Link01 className="h-6 w-6" />
                )}
              </Button>
            </div>
            {scrapeStatus && (
              <p className="text-xs text-tertiary">{scrapeStatus}</p>
            )}
          </div>

          <Input
            ref={titleRef}
            label="Item Name"
            name="title"
            placeholder="e.g., Convertible Crib"
            isRequired
          />

          <Checkbox
            name="isEssential"
            value="true"
            label="Mark as most wanted item"
          />

          <Select
            name="categoryId"
            label="Category"
            defaultSelectedKey={categories[0]?.id}
            placeholder="Select a category"
            items={categories.map((cat) => ({ id: cat.id, label: cat.name }))}
          >
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>

          <InputGroup
            label="Image URL (optional)"
            leadingAddon={<InputPrefix>http://</InputPrefix>}
          >
            <InputBase
              ref={imageUrlRef}
              name="imageUrl"
              type="url"
              placeholder="www.untitledui.com"
            />
          </InputGroup>

          <div className="grid grid-cols-2 gap-4">
            <InputGroup
              label="Price (optional)"
              prefix={currencySymbols[currency] || "$"}
              trailingAddon={
                <InputPrefix position="trailing">
                  <span className="relative inline-flex items-center">
                    <select
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
                ref={priceRef}
                name="price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
              />
            </InputGroup>
            <Input
              label="Quantity"
              name="quantityNeeded"
              type="number"
              min={1}
              defaultValue="1"
            />
          </div>

          <Checkbox
            name="isOpenToUsed"
            value="true"
            isSelected={openToUsed}
            onChange={setOpenToUsed}
            label="Mark as open to used condition item"
          />
          {openToUsed && (
            <div className="pl-6">
              <Select
                name="minimumCondition"
                label="Minimum condition"
                defaultSelectedKey="like-new"
                items={[
                  { id: "like-new", label: "Like new" },
                  { id: "very-good", label: "Very good" },
                  { id: "good", label: "Good" },
                  { id: "acceptable", label: "Acceptable" },
                ]}
              >
                {(item) => <Select.Item id={item.id} label={item.label} />}
              </Select>
            </div>
          )}

          <TextArea
            label="Notes (optional)"
            name="notes"
            placeholder="Enter a description..."
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
            <Button type="submit" className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">Add item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DemoEditItemDialog({
  item,
  categories,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  item: DemoItem;
  categories: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: DemoItem) => void;
  onDelete: (id: string) => void;
}) {
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [openToUsed, setOpenToUsed] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const urlRef = React.useRef<HTMLInputElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const priceRef = React.useRef<HTMLInputElement>(null);
  const imageUrlRef = React.useRef<HTMLInputElement>(null);

  const handleDemoScrape = async (url: string) => {
    if (!url || scraping) return;
    try { new URL(url); } catch { return; }

    setScraping(true);
    setScrapeStatus("");

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

    const updatedItem: DemoItem = {
      ...item,
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
      is_essential: formData.get("isEssential") === "true",
      notes: (formData.get("notes") as string) || null,
    };

    onSave(updatedItem);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onDelete(item.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setScrapeStatus(""); setOpenToUsed(false); setCurrency("USD"); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit item in registry</DialogTitle>
          <DialogDescription>
            This is a demo — paste a URL to see auto-fill in action.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product URL</Label>
            <div className="flex items-center gap-4">
              <InputGroup
                leadingAddon={<InputPrefix>http://</InputPrefix>}
                className="flex-1"
              >
                <InputBase
                  ref={urlRef}
                  name="externalUrl"
                  type="url"
                  placeholder="www.untitledui.com"
                  defaultValue={item.external_url || ""}
                  onBlur={(e) => handleDemoScrape((e.target as HTMLInputElement).value)}
                />
              </InputGroup>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                disabled={scraping}
                onClick={() => {
                  if (urlRef.current?.value) handleDemoScrape(urlRef.current.value);
                }}
                title="Fetch product details"
              >
                {scraping ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Link01 className="h-6 w-6" />
                )}
              </Button>
            </div>
            {scrapeStatus && (
              <p className="text-xs text-tertiary">{scrapeStatus}</p>
            )}
          </div>

          <Input
            ref={titleRef}
            label="Item Name"
            name="title"
            placeholder="e.g., Convertible Crib"
            defaultValue={item.title}
            isRequired
          />

          <Checkbox
            name="isEssential"
            value="true"
            defaultSelected={item.is_essential}
            label="Mark as most wanted item"
          />

          <Select
            name="categoryId"
            label="Category"
            defaultSelectedKey={item.category_id}
            placeholder="Select a category"
            items={categories.map((cat) => ({ id: cat.id, label: cat.name }))}
          >
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>

          <InputGroup
            label="Image URL (optional)"
            leadingAddon={<InputPrefix>http://</InputPrefix>}
          >
            <InputBase
              ref={imageUrlRef}
              name="imageUrl"
              type="url"
              placeholder="www.untitledui.com"
              defaultValue={item.image_url || ""}
            />
          </InputGroup>

          <div className="grid grid-cols-2 gap-4">
            <InputGroup
              label="Price (optional)"
              prefix={currencySymbols[currency] || "$"}
              trailingAddon={
                <InputPrefix position="trailing">
                  <span className="relative inline-flex items-center">
                    <select
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
                ref={priceRef}
                name="price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                defaultValue={item.price?.toString() || ""}
              />
            </InputGroup>
            <Input
              label="Quantity"
              name="quantityNeeded"
              type="number"
              min={1}
              defaultValue={item.quantity_needed.toString()}
            />
          </div>

          <Checkbox
            name="isOpenToUsed"
            value="true"
            isSelected={openToUsed}
            onChange={setOpenToUsed}
            label="Mark as open to used condition item"
          />
          {openToUsed && (
            <div className="pl-6">
              <Select
                name="minimumCondition"
                label="Minimum condition"
                defaultSelectedKey="like-new"
                items={[
                  { id: "like-new", label: "Like new" },
                  { id: "very-good", label: "Very good" },
                  { id: "good", label: "Good" },
                  { id: "acceptable", label: "Acceptable" },
                ]}
              >
                {(item) => <Select.Item id={item.id} label={item.label} />}
              </Select>
            </div>
          )}

          <TextArea
            label="Notes (optional)"
            name="notes"
            placeholder="Enter a description..."
            defaultValue={item.notes || ""}
            rows={3}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive-outline"
              onClick={handleRemove}
            >
              Remove item
            </Button>
            <Button type="submit" className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">Save changes</Button>
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
  onClick,
}: {
  item: DemoItem;
  onDelete: (id: string) => void;
  onToggleParentPurchased: (id: string) => void;
  onClick: () => void;
}) {
  const isFulfilled = item.quantity_fulfilled >= item.quantity_needed;
  const remaining = item.quantity_needed - item.quantity_fulfilled;
  const availableToGift = item.is_parent_purchased
    ? item.quantity_needed
    : remaining;

  return (
    <Card
      className={`py-0 gap-0 rounded-xl cursor-pointer transition-shadow hover:shadow-md ${
        isFulfilled && !item.is_parent_purchased
          ? "opacity-60"
          : item.is_parent_purchased
            ? "bg-secondary"
            : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
        <div className="flex gap-3">
          <div className="flex size-[106px] shrink-0 items-center justify-center rounded-[10px] bg-tertiary">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="size-[106px] rounded-[10px] object-cover"
              />
            ) : (
              <Package className="h-10 w-10 text-tertiary" />
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{item.title}</h3>
              <div className="shrink-0 h-6">
                {item.is_parent_purchased && (
                  <Tag variant="purchased-by-you">Purchased by you</Tag>
                )}
                {isFulfilled && !item.is_parent_purchased && (
                  <Tag variant="gifted">Gifted</Tag>
                )}
              </div>
            </div>

            {item.is_essential && (
              <div className="flex gap-2.5 flex-wrap">
                <Tag variant="most-wanted">Most wanted</Tag>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {item.price && (
                <span className="text-sm font-semibold">
                  ${item.price.toFixed(2)}
                </span>
              )}
              <span className="text-xs">
                {item.is_parent_purchased
                  ? `${availableToGift} of ${item.quantity_needed} available to gift`
                  : `${remaining} of ${item.quantity_needed} still needed`}
              </span>
            </div>

            {item.notes && (
              <p className="text-sm whitespace-pre-line line-clamp-2">{item.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {item.external_url && (
            <Button
              variant="outline"
              onClick={() => window.open(item.external_url!, '_blank', 'noopener,noreferrer')}
            >
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 shrink-0" />
                Shop
              </span>
            </Button>
          )}
          {!isFulfilled && !item.is_parent_purchased && (
            <Button
              variant="outline"
              onClick={() => onToggleParentPurchased(item.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 shrink-0" />
                Mark as bought by parent
              </span>
            </Button>
          )}
          {item.is_parent_purchased && (
            <Button
              variant="outline"
              onClick={() => onToggleParentPurchased(item.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Undo2 className="h-4 w-4 shrink-0" />
                Mark as unpurchased
              </span>
            </Button>
          )}
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
        <Button variant="outline">
          <span className="inline-flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 shrink-0" />
            Categories
          </span>
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
                    onChange={(val) => setEditName(val)}
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
                    className="text-error-primary hover:text-error-primary"
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
              onChange={(val) => setNewName(val)}
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


export default function DemoManagePage() {
  const [items, setItems] = useState<DemoItem[]>(DEMO_ITEMS);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [purchases, setPurchases] = useState<DemoPurchase[]>(DEMO_PURCHASES);
  const [copied, setCopied] = useState(false);
  const [editingItem, setEditingItem] = useState<DemoItem | null>(null);
  const [suggestions, setSuggestions] = useState<DemoSuggestion[]>(DEMO_SUGGESTIONS);

  const handleAddItem = (item: DemoItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleUpdateItem = (updatedItem: DemoItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
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

  const handleAcceptSuggestion = (suggestion: DemoSuggestion) => {
    const newItem: DemoItem = {
      id: `item-${Date.now()}`,
      title: suggestion.title,
      category_id: categories[0]?.id || "",
      external_url: suggestion.external_url,
      image_url: null,
      price: suggestion.price,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      is_essential: false,
      is_parent_purchased: false,
      notes: suggestion.notes,
      sort_order: items.length,
    };
    setItems((prev) => [...prev, newItem]);
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestion.id ? { ...s, status: "accepted" as const } : s
      )
    );
  };

  const handleDeclineSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "declined" as const } : s
      )
    );
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

  // Build navigation items for category sidebar
  const navItems: CategoryNavItem[] = [];
  for (const category of categories) {
    const categoryItems = itemsByCategory.get(category.id) || [];
    if (categoryItems.length > 0) {
      navItems.push({
        id: getCategorySectionId(category.id),
        name: category.name,
        count: categoryItems.length,
      });
    }
  }

  const activePurchases = purchases.filter((p) => p.status !== "cancelled");
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-brand-solid text-white py-2 px-4 text-center text-sm">
        This is a demo — changes are local and won&apos;t be saved.{" "}
        <Link href="/signup" className="underline font-medium">
          Create your own registry
        </Link>
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
          >
            <Baby className="h-5 w-5 text-brand-600" />
            <span>Regibee</span>
          </Link>
          <span className="ml-4 text-sm text-tertiary hidden md:inline">
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
              <p className="text-tertiary ml-10">
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
                <span className="inline-flex items-center gap-1.5">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 shrink-0" />
                      Share Link
                    </>
                  )}
                </span>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/demo" target="_blank">
                  <span className="inline-flex items-center gap-1.5">
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    Preview
                  </span>
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/demo/settings">
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
                <p className="text-sm text-tertiary">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-tertiary">
                  Fulfilled
                </p>
                <p className="text-2xl font-bold">{fulfilledItems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-tertiary">
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
                <p className="text-sm text-tertiary">
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
          <Tabs defaultSelectedKey="items">
            <TabList
              type="button-minimal"
              size="sm"
              className="w-fit"
              items={[
                { id: "items", children: "Items", badge: totalItems },
                { id: "purchases", children: "Gift Activity", badge: purchases.length },
                { id: "suggestions", children: "Suggestions Inbox", badge: pendingSuggestions.length },
              ]}
            >
              {(item) => (
                <Tab key={item.id} id={item.id} badge={item.badge}>
                  {item.children}
                </Tab>
              )}
            </TabList>

            <TabPanel id="items" className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Registry Items</h2>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/demo/checklist">
                      <span className="inline-flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 shrink-0" />
                        Checklist
                      </span>
                    </Link>
                  </Button>
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

              <div className="flex gap-8 items-start">
                {navItems.length > 1 && <CategoryNav categories={navItems} />}
                <div className="flex-1 min-w-0 space-y-8">
                  {categories.map((category) => {
                    const categoryItems =
                      itemsByCategory.get(category.id) || [];
                    if (categoryItems.length === 0) return null;

                    return (
                      <div key={category.id} id={getCategorySectionId(category.id)} className="scroll-mt-20">
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
                              onClick={() => setEditingItem(item)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingItem && (
                <DemoEditItemDialog
                  item={editingItem}
                  categories={categories}
                  open={!!editingItem}
                  onOpenChange={(open) => { if (!open) setEditingItem(null); }}
                  onSave={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              )}
            </TabPanel>

            <TabPanel id="purchases" className="pt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Gift Activity</h2>
                <p className="text-sm text-tertiary">
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
                    const item = items.find((i) => i.id === purchase.registry_item_id);
                    const isParentPurchased = item?.is_parent_purchased ?? false;
                    const tagType = isCancelled
                      ? "cancelled"
                      : purchase.cash_fund_id
                        ? "contribution"
                        : isParentPurchased
                          ? "covered"
                          : "purchased";
                    const displayAmount = purchase.cash_fund_id
                      ? purchase.amount
                      : item?.price;
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
                                        ? "bg-[#09c69a] border-[#09c69a] text-[#181d27]"
                                        : tagType === "covered"
                                          ? "bg-[#a0e4d4] border-[#a0e4d4] text-[#181d27]"
                                          : "bg-[#f7efa9] border-[#f7efa9] text-[#181d27]"
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
                                    ? `$${Number(displayAmount).toFixed(2)}`
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
                                  {new Date(
                                    purchase.created_at
                                  ).toLocaleDateString("en-US", {
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
            </TabPanel>

            <TabPanel id="suggestions" className="pt-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Suggestion Inbox</h2>
                <p className="text-sm text-tertiary">
                  Items suggested by your guests
                </p>
              </div>

              {suggestions.length === 0 ? (
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
                  {suggestions
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((suggestion) => (
                      <Card key={suggestion.id} className="py-0">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="flex-1 min-w-0 text-base font-semibold text-secondary">
                                {suggestion.title}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                                  suggestion.status === "pending"
                                    ? "border-[#717680] text-[#181d27]"
                                    : suggestion.status === "accepted"
                                      ? "bg-[#004659] border-[#004659] text-white"
                                      : "bg-[#f9b8b9] border-[#f9b8b9] text-[#181d27]"
                                }`}
                              >
                                {suggestion.status === "pending"
                                  ? "Pending"
                                  : suggestion.status === "accepted"
                                    ? "Added"
                                    : "Declined"}
                              </span>
                              <span className="text-xs text-secondary shrink-0">
                                {new Date(
                                  suggestion.created_at
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {suggestion.price != null && (
                              <p className="text-sm font-semibold text-secondary">
                                ${suggestion.price.toFixed(2)}
                              </p>
                            )}
                            <div className="flex items-center gap-2.5 text-xs text-secondary">
                              <span>Suggested by {suggestion.suggested_by_name}</span>
                              {suggestion.suggested_by_email && (
                                <span>{suggestion.suggested_by_email}</span>
                              )}
                            </div>
                            {suggestion.notes && (
                              <p className="text-xs text-secondary">
                                &ldquo;{suggestion.notes}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center justify-between pt-2">
                              {suggestion.external_url ? (
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={suggestion.external_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <ExternalLink className="h-4 w-4 shrink-0" />
                                      Shop
                                    </span>
                                  </a>
                                </Button>
                              ) : (
                                <div />
                              )}
                              {suggestion.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="destructive-outline"
                                    size="sm"
                                    onClick={() =>
                                      handleDeclineSuggestion(suggestion.id)
                                    }
                                  >
                                    Decline
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleAcceptSuggestion(suggestion)
                                    }
                                    className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      <Plus className="h-4 w-4 shrink-0" />
                                      Add to registry
                                    </span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabPanel>
          </Tabs>
        </div>
      </main>

      <ScrollToTop />
    </div>
  );
}
