"use client";

import { useState, useRef } from "react";
import { Loader2, ChevronDown } from "lucide-react";
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
} from "@/components/ui/dialog";
import { updateRegistryItem, deleteRegistryItem } from "@/lib/actions/registry";
import { scrapeProductUrl } from "@/lib/actions/scrape";
import { estimateTax } from "@/lib/actions/tax";

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
  categories: { id: string; name: string }[];
  zipCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  categories,
  zipCode,
  open,
  onOpenChange,
}: EditItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [scrapeIsError, setScrapeIsError] = useState(false);
  const [error, setError] = useState("");
  const [openToUsed, setOpenToUsed] = useState(item.is_open_to_used);
  const [currency, setCurrency] = useState("USD");
  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(item.price?.toString() || "");
  const [imageUrl, setImageUrl] = useState(item.image_url || "");
  const [imageError, setImageError] = useState(false);
  const [externalUrl, setExternalUrl] = useState(item.external_url || "");
  const [taxInfo, setTaxInfo] = useState<{ original: string; rate: number } | null>(null);

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
    if (!zipCode || taxInfo) {
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
        if (zipCode) {
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
        setImageError(false);
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
    } else {
      onOpenChange(false);
      setScrapeStatus("");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setScrapeStatus(""); setScrapeIsError(false); setOpenToUsed(item.is_open_to_used); setCurrency("USD"); setError(""); setTitle(item.title); setPrice(item.price?.toString() || ""); setImageUrl(item.image_url || ""); setImageError(false); setExternalUrl(item.external_url || ""); setTaxInfo(null); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit item in registry</DialogTitle>
          <DialogDescription>
            Update the details for this registry item.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product URL</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={urlRef}
                name="externalUrl"
                placeholder="https://www.example.com"
                value={externalUrl}
                onChange={setExternalUrl}
                onBlur={(e) => handleScrape((e.target as HTMLInputElement).value)}
                className="flex-1"
              />
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
            </div>
            {scrapeStatus && (
              <p className={`text-xs ${scrapeIsError ? "text-error-primary" : "text-tertiary"}`}>{scrapeStatus}</p>
            )}
          </div>

          <Input
            label="Item Name"
            name="title"
            placeholder="e.g., Convertible Crib"
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

          <Select
            name="categoryId"
            label="Category"
            defaultSelectedKey={item.category_id || undefined}
            placeholder="Select a category"
            items={categories.map((cat) => ({ id: cat.id, label: cat.name }))}
          >
            {(catItem) => <Select.Item id={catItem.id} label={catItem.label} />}
          </Select>

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
              defaultValue={item.quantity_needed.toString()}
            />
          </div>
          {taxInfo && (
            <p className="text-xs text-tertiary">
              ${taxInfo.original} + ~{(taxInfo.rate * 100).toFixed(1)}% tax
            </p>
          )}

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
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Remove item"}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
