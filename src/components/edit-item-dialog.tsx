"use client";

import { useState, useRef } from "react";
import { Loader2, ChevronDown, ExternalLink } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCategory,
  deleteRegistryItem,
  toggleParentPurchased,
  updateRegistryItem,
} from "@/lib/actions/registry";
import { fetchProductDetails } from "@/lib/fetch-product";
import { estimateTax } from "@/lib/actions/tax";
import { copyFor } from "@/lib/registry-copy";
import type { PersonalEventType, RegistryType } from "@/lib/types";
import type { RetailerRegistry, StoreId } from "@/lib/retailers";
import { StoreLinkNotice } from "@/components/store-link-notice";
import { ItemImageField } from "@/components/item-image-field";
import { uploadRegistryPhoto } from "@/lib/upload-registry-photo";

interface Category {
  id: string;
  name: string;
}

interface EditItemDialogProps {
  item: {
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
  };
  registryId: string;
  categories: Category[];
  zipCode?: string;
  registryType?: RegistryType;
  eventType?: PersonalEventType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The owner's linked store registries. Leave unset to hide store notices. */
  linkedRegistries?: RetailerRegistry[];
  /** Stores that other items on this registry have registry links from. */
  storesWithRegistryLinks?: StoreId[];
  /**
   * The titles of the owner's other lists this item is on. Then changes show
   * on those lists too, and removing it here keeps it there.
   */
  otherLists?: string[];
}

/** "Wishlist", "Wishlist and Birthday", "Wishlist, Birthday and 2 more". */
function listNames(titles: string[]): string {
  if (titles.length <= 2) return titles.join(" and ");
  return `${titles[0]}, ${titles[1]} and ${titles.length - 2} more`;
}

/**
 * The link as typed, ready to open in a new tab, or null when it isn't a web
 * link. A link typed without https:// gets it. Saving adds http:// instead,
 * and stores redirect that to https:// anyway.
 */
function openableLink(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    // Opened as typed, so the store's registry params stay exactly as they are.
    return withScheme;
  } catch {
    return null;
  }
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export function EditItemDialog({
  item,
  registryId,
  categories: initialCategories,
  zipCode,
  registryType = "baby",
  eventType = null,
  open,
  onOpenChange,
  linkedRegistries,
  storesWithRegistryLinks,
  otherLists = [],
}: EditItemDialogProps) {
  const isBaby = registryType === "baby";
  const copy = copyFor({ registryType, eventType });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [scrapeIsError, setScrapeIsError] = useState(false);
  const [error, setError] = useState("");
  const [openToUsed, setOpenToUsed] = useState(item.is_open_to_used);
  const [parentPurchased, setParentPurchased] = useState(item.is_parent_purchased);
  const [currency, setCurrency] = useState("USD");
  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(item.price != null ? item.price.toFixed(2) : "");
  const [imageUrl, setImageUrl] = useState(item.image_url || "");
  const [externalUrl, setExternalUrl] = useState(item.external_url || "");
  const [taxInfo, setTaxInfo] = useState<{ original: string; rate: number } | null>(null);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoryId, setCategoryId] = useState<string | undefined>(
    item.category_id ?? undefined,
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const urlRef = useRef<HTMLInputElement>(null);
  const openUrl = openableLink(externalUrl);

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
    if (!item.is_parent_purchased || !zipCode || taxInfo) {
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

    const result = await fetchProductDetails(url, {
      onReadingWithExtension: () => setScrapeStatus("Reading the page in a background tab with the Regibee extension…"),
    });

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
        if (item.is_parent_purchased && zipCode) {
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
      if (result.imageUrl && !imageUrl) {
        setImageUrl(result.imageUrl);
        filled.push("image");
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
    const result = await updateRegistryItem(item.id, registryId, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Apply the self-purchase toggle via the dedicated action if it changed.
    if (parentPurchased !== item.is_parent_purchased) {
      await toggleParentPurchased(item.id, registryId, parentPurchased);
    }
    onOpenChange(false);
    setScrapeStatus("");
    setLoading(false);
  };

  const onOtherLists = otherLists.length > 0;
  const handleDelete = async () => {
    const question = onOtherLists
      ? `Remove "${item.title}" from this list? It stays on ${listNames(otherLists)}.`
      : `Delete "${item.title}"? This cannot be undone.`;
    if (!confirm(question)) return;
    setDeleting(true);
    const result = await deleteRegistryItem(item.id, registryId);
    if (result?.error) {
      setError(result.error);
    } else {
      onOpenChange(false);
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setScrapeStatus(""); setScrapeIsError(false); setOpenToUsed(item.is_open_to_used); setParentPurchased(item.is_parent_purchased); setCurrency("USD"); setError(""); setTitle(item.title); setPrice(item.price != null ? item.price.toFixed(2) : ""); setImageUrl(item.image_url || ""); setExternalUrl(item.external_url || ""); setTaxInfo(null); setCategoryId(item.category_id ?? undefined); setAddingCategory(false); setNewCategoryName(""); setCategoryError(""); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit item in registry</DialogTitle>
          <DialogDescription>
            {onOtherLists
              ? `It's also on ${listNames(otherLists)}, so changes show there too. Its category is only for this list.`
              : "Update the details for this registry item."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product URL</Label>
            <div className="flex items-center gap-2 sm:gap-4">
              <Input
                ref={urlRef}
                name="externalUrl"
                placeholder="https://www.example.com"
                value={externalUrl}
                onChange={setExternalUrl}
                onBlur={(e) => handleScrape((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  // Enter reads the link instead of saving the form.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScrape(externalUrl);
                  }
                }}
                aria-label="Product URL"
                inputMode="url"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                enterKeyHint="go"
                className="flex-1"
              />
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  disabled={scraping}
                  onClick={() => {
                    if (urlRef.current?.value) handleScrape(urlRef.current.value);
                  }}
                  title="Fetch product details"
                >
                  {scraping ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Link01 className="h-6 w-6" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  disabled={!openUrl}
                  onClick={() => {
                    if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
                  }}
                  title="Open link in a new tab"
                >
                  <ExternalLink className="h-6 w-6" />
                </Button>
              </div>
            </div>
            {linkedRegistries && (
              <StoreLinkNotice
                url={externalUrl}
                registryId={registryId}
                linkedRegistries={linkedRegistries}
                storesWithRegistryLinks={storesWithRegistryLinks}
              />
            )}
            {scrapeStatus && (
              <p className={`text-xs ${scrapeIsError ? "text-error-primary" : "text-tertiary"}`}>{scrapeStatus}</p>
            )}
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
            defaultSelected={item.is_essential}
            label="Mark as most wanted item"
          />

          <div className="space-y-1.5">
            {addingCategory ? (
              <div className="space-y-1.5">
                <Label>New category</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    name="newCategoryName"
                    placeholder="e.g., Kitchen"
                    value={newCategoryName}
                    onChange={setNewCategoryName}
                    autoComplete="off"
                    className="flex-1 max-sm:basis-full"
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
                  {(catItem) => <Select.Item id={catItem.id} label={catItem.label} />}
                </Select>
                <button
                  type="button"
                  onClick={() => setAddingCategory(true)}
                  className="text-xs font-medium text-brand-600 hover:underline max-sm:min-h-11 max-sm:pr-3"
                >
                  + Create category
                </button>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <ItemImageField
              value={imageUrl}
              onChange={setImageUrl}
              upload={(file) => uploadRegistryPhoto(registryId, file)}
            />
          </div>

          {/* On phones the price gets most of the row, as in the add dialog. */}
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-4 sm:grid-cols-2">
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
                      aria-label="Currency"
                      className="appearance-none bg-transparent pr-5 text-primary outline-none cursor-pointer max-sm:-my-2.5 max-sm:py-2.5"
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
                inputMode="decimal"
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
              inputMode="numeric"
              min={1}
              defaultValue={item.quantity_needed.toString()}
            />
          </div>
          {taxInfo && (
            <p className="text-xs text-tertiary">
              ${taxInfo.original} + ~{(taxInfo.rate * 100).toFixed(1)}% tax
            </p>
          )}

          <Checkbox
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
                defaultSelectedKey={item.minimum_condition || "like-new"}
                items={[
                  { id: "like-new", label: "Like new" },
                  { id: "very-good", label: "Very good" },
                  { id: "good", label: "Good" },
                  { id: "acceptable", label: "Acceptable" },
                ]}
              >
                {(condItem) => <Select.Item id={condItem.id} label={condItem.label} />}
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

          {error && <p className="text-sm text-error-primary">{error}</p>}

          {/* Three buttons don't fit a phone's sticky bar, so on phones
              Remove item sits above it, at the end of the form. */}
          <Button
            type="button"
            variant="destructive-outline"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full sm:hidden"
          >
            {deleting ? "Removing..." : onOtherLists ? "Remove from list" : "Remove item"}
          </Button>
          <DialogFooter sticky>
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
              onClick={handleDelete}
              disabled={deleting}
              className="max-sm:hidden"
            >
              {deleting ? "Removing..." : onOtherLists ? "Remove from list" : "Remove item"}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
