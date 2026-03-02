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
    notes: string | null;
    category_id: string | null;
  };
  registryId: string;
  categories: { id: string; name: string }[];
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
  open,
  onOpenChange,
}: EditItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [scrapeIsError, setScrapeIsError] = useState(false);
  const [error, setError] = useState("");
  const [openToUsed, setOpenToUsed] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const urlRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const imageUrlRef = useRef<HTMLInputElement>(null);

  const normalizeUrl = (url: string) => {
    if (!url) return url;
    if (!/^https?:\/\//i.test(url)) return `http://${url}`;
    return url;
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
      if (result.title && titleRef.current && !titleRef.current.value) {
        titleRef.current.value = result.title;
        filled.push("title");
      }
      if (result.price && priceRef.current && !priceRef.current.value) {
        priceRef.current.value = result.price;
        filled.push("price");
      }
      if (result.imageUrl && imageUrlRef.current && !imageUrlRef.current.value) {
        imageUrlRef.current.value = result.imageUrl;
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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setScrapeStatus(""); setScrapeIsError(false); setOpenToUsed(false); setCurrency("USD"); setError(""); } }}>
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
                  onBlur={(e) => handleScrape((e.target as HTMLInputElement).value)}
                />
              </InputGroup>
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
            defaultSelectedKey={item.category_id || undefined}
            placeholder="Select a category"
            items={categories.map((cat) => ({ id: cat.id, label: cat.name }))}
          >
            {(catItem) => <Select.Item id={catItem.id} label={catItem.label} />}
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
