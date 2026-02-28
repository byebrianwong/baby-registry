"use client";

import { useState, useRef } from "react";
import { Plus, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addRegistryItem } from "@/lib/actions/registry";
import { scrapeProductUrl } from "@/lib/actions/scrape";

interface Category {
  id: string;
  name: string;
}

interface AddItemDialogProps {
  registryId: string;
  categories: Category[];
  defaultValues?: {
    title?: string;
    price?: string;
    categoryId?: string;
    quantityNeeded?: string;
    isEssential?: boolean;
  };
  trigger?: React.ReactNode;
}

export function AddItemDialog({
  registryId,
  categories,
  defaultValues,
  trigger,
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string>("");
  const [error, setError] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const imageUrlRef = useRef<HTMLInputElement>(null);

  const handleScrape = async (url: string) => {
    if (!url || scraping) return;

    try {
      new URL(url);
    } catch {
      return;
    }

    setScraping(true);
    setScrapeStatus("");

    const result = await scrapeProductUrl(url);

    if (result.error) {
      setScrapeStatus(result.error);
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
    const result = await addRegistryItem(registryId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setScrapeStatus("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setScrapeStatus(""); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Item to Registry</DialogTitle>
          <DialogDescription>
            Paste a product URL to auto-fill, or add a custom item.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalUrl">Product URL</Label>
            <div className="flex gap-2">
              <Input
                id="externalUrl"
                name="externalUrl"
                type="url"
                placeholder="https://www.amazon.com/..."
                onBlur={(e) => handleScrape(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={scraping}
                onClick={() => {
                  const input = document.getElementById("externalUrl") as HTMLInputElement;
                  if (input?.value) handleScrape(input.value);
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
              <p className="text-xs text-tertiary">{scrapeStatus}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Item Name</Label>
            <Input
              id="title"
              name="title"
              ref={titleRef}
              placeholder="e.g., Convertible Crib"
              defaultValue={defaultValues?.title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={defaultValues?.categoryId}>
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
                defaultValue={defaultValues?.price}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantityNeeded">Quantity</Label>
              <Input
                id="quantityNeeded"
                name="quantityNeeded"
                type="number"
                min="1"
                defaultValue={defaultValues?.quantityNeeded || "1"}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isEssential"
              name="isEssential"
              value="true"
              defaultChecked={defaultValues?.isEssential}
            />
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
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
