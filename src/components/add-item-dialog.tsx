"use client";

import { useState, useRef } from "react";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import { Link01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
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
import { addRegistryItem, createCategory } from "@/lib/actions/registry";
import { scrapeProductUrl } from "@/lib/actions/scrape";
import { estimateTax } from "@/lib/actions/tax";
import type { PersonalEventType, RegistryType } from "@/lib/types";
import { copyFor } from "@/lib/registry-copy";
import type { RetailerRegistry, StoreId } from "@/lib/retailers";
import { StoreLinkNotice } from "@/components/store-link-notice";

interface Category {
  id: string;
  name: string;
}

interface AddItemDialogProps {
  registryId: string;
  categories: Category[];
  zipCode?: string;
  registryType?: RegistryType;
  eventType?: PersonalEventType | null;
  defaultValues?: {
    title?: string;
    price?: string;
    categoryId?: string;
    quantityNeeded?: string;
    isEssential?: boolean;
  };
  trigger?: React.ReactNode;
  /** The owner's linked store registries. Leave unset to hide store notices
   *  (personal registries don't use them). */
  linkedRegistries?: RetailerRegistry[];
  /** Stores that other items on this registry have registry links from. */
  storesWithRegistryLinks?: StoreId[];
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export function AddItemDialog({
  registryId,
  categories: initialCategories,
  zipCode,
  registryType = "baby",
  eventType = null,
  defaultValues,
  trigger,
  linkedRegistries,
  storesWithRegistryLinks,
}: AddItemDialogProps) {
  const copy = copyFor({ registryType, eventType });
  const isBaby = registryType === "baby";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string>("");
  const [scrapeIsError, setScrapeIsError] = useState(false);
  const [error, setError] = useState("");
  const [parentPurchased, setParentPurchased] = useState(false);
  const [openToUsed, setOpenToUsed] = useState(false);
  const [taxInfo, setTaxInfo] = useState<{ original: string; rate: number } | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [title, setTitle] = useState(defaultValues?.title || "");
  const [price, setPrice] = useState(defaultValues?.price ? parseFloat(defaultValues.price).toFixed(2) : "");
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageCandidates, setImageCandidates] = useState<string[]>([]);
  const [brokenCandidates, setBrokenCandidates] = useState<Set<string>>(new Set());
  const [categoryId, setCategoryId] = useState<string | undefined>(defaultValues?.categoryId);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const [externalUrl, setExternalUrl] = useState("");

  const urlRef = useRef<HTMLInputElement>(null);

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (!/^https?:\/\//i.test(url)) return `http://${url}`;
    return url;
  };

  const handlePriceChange = (val: string) => {
    setPrice(val);
    setTaxInfo(null);
  };

  const handlePriceBlur = async () => {
    if (!price) return;
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed <= 0) return;
    if (!parentPurchased || !zipCode || taxInfo) {
      setPrice(parsed.toFixed(2));
      return;
    }
    const result = await estimateTax(zipCode, parsed);
    if (result) {
      setPrice(result.priceWithTax);
      setTaxInfo({ original: parsed.toFixed(2), rate: result.taxRate });
    } else {
      setPrice(parsed.toFixed(2));
    }
  };

  const inferCategory = (productTitle: string): string | undefined => {
    const keywords: Record<string, string[]> = {
      "nursery & sleep": ["crib", "bassinet", "blanket", "swaddle", "mattress", "monitor", "mobile", "rocker", "glider", "rocking", "nightlight", "sound machine", "white noise", "sleep sack", "sheet", "pillow", "nursery", "cradle", "moses basket"],
      "feeding": ["bottle", "nursing", "breast pump", "formula", "bib", "highchair", "high chair", "sippy", "pacifier", "sterilizer", "warmer", "feeding", "breastfeed", "nipple", "lactation", "burp cloth"],
      "diapering": ["diaper", "wipe", "changing pad", "changing table", "pail", "rash cream", "nappy", "potty"],
      "gear & travel": ["stroller", "car seat", "carrier", "wrap", "sling", "travel", "pack n play", "playard", "play yard", "jogger", "wagon", "backpack carrier", "bike seat", "gate", "baby gate"],
      "bath": ["bath", "tub", "towel", "washcloth", "shampoo", "soap", "lotion", "grooming"],
      "clothing": ["onesie", "bodysuit", "pajama", "sleeper", "outfit", "romper", "dress", "sock", "shoe", "bootie", "hat", "mitten", "jacket", "coat", "clothing", "clothes", "gown"],
      "health & safety": ["thermometer", "medicine", "nasal", "aspirator", "humidifier", "first aid", "safety", "baby proof", "outlet cover", "cabinet lock", "corner guard", "sunscreen", "vitamin"],
      "toys & books": ["toy", "book", "rattle", "teether", "play mat", "playmat", "activity", "stuffed", "plush", "puzzle", "block", "game", "doll", "figurine", "reading"],
      "maternity & postpartum": ["maternity", "postpartum", "nursing bra", "belly band", "recovery", "prenatal", "postnatal", "mama", "mom"],
      "gifts & extras": ["gift card", "gift basket", "keepsake", "memory book", "photo", "frame", "ornament"],
    };

    const lower = productTitle.toLowerCase();
    for (const [categoryName, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lower.includes(word)) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === categoryName
          );
          if (match) return match.id;
        }
      }
    }
    return undefined;
  };

  const handleScrape = async (rawUrl: string) => {
    if (!rawUrl || scraping) return;
    const url = normalizeUrl(rawUrl);

    try {
      new URL(url);
    } catch {
      return;
    }

    setScraping(true);
    setScrapeStatus("");
    setScrapeIsError(false);

    const result = await scrapeProductUrl(url);

    if (result.error) {
      setScrapeStatus(result.error);
      setScrapeIsError(true);
    } else {
      let filled: string[] = [];
      if (result.title && !title) {
        setTitle(result.title);
        filled.push("title");
      }
      if (result.price && !price) {
        let finalPrice = parseFloat(result.price).toFixed(2);
        let taxNote = "";
        if (parentPurchased && zipCode) {
          const taxResult = await estimateTax(zipCode, parseFloat(result.price));
          if (taxResult) {
            taxNote = ` (incl. ~${(taxResult.taxRate * 100).toFixed(1)}% tax)`;
            setTaxInfo({ original: finalPrice, rate: taxResult.taxRate });
            finalPrice = taxResult.priceWithTax;
          }
        }
        setPrice(finalPrice);
        filled.push("price" + taxNote);
      }
      const candidates = result.imageUrls ?? (result.imageUrl ? [result.imageUrl] : []);
      if (candidates.length > 0) {
        setImageCandidates(candidates);
        setBrokenCandidates(new Set());
        if (!imageUrl) {
          setImageUrl(candidates[0]);
          setImageError(false);
          filled.push(candidates.length > 1 ? `image (${candidates.length} options)` : "image");
        }
      }
      const titleForCategory = result.title || title;
      if (titleForCategory && !categoryId) {
        const inferred = inferCategory(titleForCategory);
        if (inferred) {
          setCategoryId(inferred);
          filled.push("category");
        }
      }
      if (filled.length > 0) {
        setScrapeStatus(`Auto-filled ${filled.join(", ")}`);
      } else {
        setScrapeStatus("No new data found to fill");
      }
    }

    setScraping(false);
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    // Prepend protocol if the visual http:// prefix was relied on
    for (const field of ["externalUrl", "imageUrl"]) {
      const val = formData.get(field) as string;
      if (val && !/^https?:\/\//i.test(val)) {
        formData.set(field, `http://${val}`);
      }
    }
    const result = await addRegistryItem(registryId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      // Reset all state before closing so reopening shows a clean form
      setScrapeStatus("");
      setScrapeIsError(false);
      setParentPurchased(false);
      setOpenToUsed(false);
      setTaxInfo(null);
      setCurrency("USD");
      setTitle(defaultValues?.title || "");
      setPrice(defaultValues?.price ? parseFloat(defaultValues.price).toFixed(2) : "");
      setImageUrl("");
      setImageError(false);
      setImageCandidates([]);
      setBrokenCandidates(new Set());
      setCategoryId(defaultValues?.categoryId);
      setExternalUrl("");
      setError("");
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setScrapeStatus(""); setScrapeIsError(false); setParentPurchased(false); setOpenToUsed(false); setTaxInfo(null); setCurrency("USD"); setTitle(defaultValues?.title || ""); setPrice(defaultValues?.price ? parseFloat(defaultValues.price).toFixed(2) : ""); setImageUrl(""); setImageError(false); setImageCandidates([]); setBrokenCandidates(new Set()); setCategoryId(defaultValues?.categoryId); setExternalUrl(""); setError(""); } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4 shrink-0" />
              Add Item
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add item to registry</DialogTitle>
          <DialogDescription>
            Add anything from any store, in two taps.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="min-w-0 space-y-5">
          {/* Step 1 — URL hero */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                1
              </span>
              <Label className="!text-sm !font-semibold !text-primary">
                Paste a product link from any store
              </Label>
            </div>
            <p className="text-xs text-tertiary pl-8">
              Target, Amazon, Etsy, or a small shop — we&apos;ll pull the name, price, and image.
            </p>
            <div className="flex items-stretch gap-2 pl-8">
              <Input
                ref={urlRef}
                name="externalUrl"
                placeholder="https://www.target.com/..."
                onChange={setExternalUrl}
                onBlur={(e) => handleScrape((e.target as HTMLInputElement).value)}
                className="flex-1"
              />
              <Button
                type="button"
                disabled={scraping}
                onClick={() => {
                  if (urlRef.current?.value) handleScrape(urlRef.current.value);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  {scraping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link01 className="h-4 w-4" />
                  )}
                  {scraping ? "Fetching…" : "Fetch"}
                </span>
              </Button>
            </div>
            {linkedRegistries && (
              <StoreLinkNotice
                url={externalUrl}
                registryId={registryId}
                linkedRegistries={linkedRegistries}
                storesWithRegistryLinks={storesWithRegistryLinks}
                className="ml-8"
              />
            )}
            {scrapeStatus && (
              <p className={`text-xs pl-8 ${scrapeIsError ? "text-error-primary" : "text-brand-600"}`}>{scrapeStatus}</p>
            )}
          </div>

          {/* Step 2 — details */}
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-tertiary">
              2
            </span>
            <span className="text-sm font-semibold text-primary">
              Confirm the details
            </span>
            <span className="ml-auto text-xs text-tertiary">
              or fill in manually
            </span>
          </div>

          <Input
            label="Item Name"
            name="title"
            placeholder={isBaby ? "e.g., Convertible Crib" : "e.g., Wireless Headphones"}
            value={title}
            onChange={setTitle}
            isRequired
          />

          <Checkbox
            name="isEssential"
            value="true"
            defaultSelected={defaultValues?.isEssential}
            label="Mark as most wanted item"
          />

          <div className="space-y-1.5">
            {addingCategory ? (
              <div className="space-y-1.5">
                <Label>New category</Label>
                <div className="flex items-center gap-2">
                  <Input
                    name="newCategoryName"
                    placeholder="e.g., Kitchen"
                    value={newCategoryName}
                    onChange={setNewCategoryName}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    disabled={!newCategoryName.trim() || creatingCategory}
                    onClick={async () => {
                      setCreatingCategory(true);
                      setCategoryError("");
                      const result = await createCategory(
                        registryId,
                        newCategoryName.trim(),
                      );
                      if (result?.error) {
                        setCategoryError(result.error);
                      } else if (result?.category) {
                        const next = [...categories, result.category];
                        setCategories(next);
                        setCategoryId(result.category.id);
                        setAddingCategory(false);
                        setNewCategoryName("");
                      }
                      setCreatingCategory(false);
                    }}
                  >
                    {creatingCategory ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddingCategory(false);
                      setNewCategoryName("");
                      setCategoryError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {categoryError && (
                  <p className="text-xs text-error-primary">{categoryError}</p>
                )}
              </div>
            ) : (
              <>
                <Select
                  name="categoryId"
                  label="Category"
                  selectedKey={categoryId ?? null}
                  onSelectionChange={(key) =>
                    setCategoryId(key?.toString() || undefined)
                  }
                  placeholder={
                    categories.length === 0
                      ? "No categories yet"
                      : "Select a category"
                  }
                  items={categories.map((cat) => ({ id: cat.id, label: cat.name }))}
                  isDisabled={categories.length === 0}
                >
                  {(item) => <Select.Item id={item.id} label={item.label} />}
                </Select>
                <button
                  type="button"
                  onClick={() => setAddingCategory(true)}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  + Create category
                </button>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Input
              label="Image URL (optional)"
              name="imageUrl"
              placeholder="https://www.example.com/image.jpg"
              value={imageUrl}
              onChange={(val) => { setImageUrl(val); setImageError(false); }}
            />
            {imageUrl && !imageError && (
              <div className="flex size-16 items-center justify-center rounded-lg bg-tertiary">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="size-16 rounded-lg object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
            {imageCandidates.filter((c) => !brokenCandidates.has(c)).length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs text-tertiary">
                  Choose which image to use:
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageCandidates
                    .filter((candidate) => !brokenCandidates.has(candidate))
                    .map((candidate) => {
                      const selected = candidate === imageUrl;
                      return (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => {
                            setImageUrl(candidate);
                            setImageError(false);
                          }}
                          aria-label="Use this image"
                          aria-pressed={selected}
                          className={`relative size-14 shrink-0 overflow-hidden rounded-md border-2 bg-tertiary transition ${
                            selected
                              ? "border-brand-600 ring-2 ring-brand-600/30"
                              : "border-transparent hover:border-secondary"
                          }`}
                        >
                          <img
                            src={candidate}
                            alt=""
                            className="size-full object-cover"
                            onError={() =>
                              setBrokenCandidates((prev) => {
                                const next = new Set(prev);
                                next.add(candidate);
                                return next;
                              })
                            }
                          />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputGroup
              label="Price (optional)"
              name="price"
              value={price}
              onChange={handlePriceChange}
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
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                onBlur={handlePriceBlur}
              />
            </InputGroup>
            <Input
              label="Quantity"
              name="quantityNeeded"
              type="number"
              min={1}
              defaultValue={defaultValues?.quantityNeeded || "1"}
            />
          </div>
          {taxInfo && (
            <p className="text-xs text-tertiary">
              ${taxInfo.original} + ~{(taxInfo.rate * 100).toFixed(1)}% tax
            </p>
          )}

          <Checkbox
            name="isParentPurchased"
            value="true"
            isSelected={parentPurchased}
            onChange={setParentPurchased}
            label={copy.selfPurchaseButton}
          />

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

          {error && <p className="text-sm text-error-primary">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
