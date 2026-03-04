"use client";

import { useState } from "react";
import { Lightbulb, Loader2, ChevronDown } from "lucide-react";
import { Link01, Mail01 } from "@untitledui/icons";
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
import { suggestItem } from "@/lib/actions/registry";

interface SuggestItemDialogProps {
  registryId: string;
  categories?: { id: string; name: string }[];
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export function SuggestItemDialog({ registryId, categories = [] }: SuggestItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("registryId", registryId);
    // Prepend protocol if the visual http:// prefix was relied on
    const externalUrl = formData.get("externalUrl") as string;
    if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
      formData.set("externalUrl", `http://${externalUrl}`);
    }

    const result = await suggestItem(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSuccess(false);
      setError("");
      setCurrency("USD");
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
            <form action={handleSubmit} className="space-y-4">
              <Input
                label="Item Name"
                name="title"
                placeholder="e.g. Baby Monitor"
                isRequired
              />

              <Checkbox
                name="isAvailableToGift"
                value="true"
                label="Mark as available to gift"
              />

              <div className="space-y-1.5">
                <Label>Product URL (optional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    name="externalUrl"
                    placeholder="https://www.example.com"
                    className="flex-1"
                  />
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

              {categories.length > 0 && (
                <Select
                  name="categoryId"
                  label="Category"
                  placeholder="Select a category"
                  items={categories.map((cat) => ({ id: cat.id, label: cat.name }))}
                >
                  {(item) => <Select.Item id={item.id} label={item.label} />}
                </Select>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="Estimated price (optional)"
                  prefix={currencySymbols[currency] || "$"}
                  trailingAddon={
                    <InputPrefix position="trailing">
                      <span className="relative inline-flex items-center">
                        <select
                          className="appearance-none bg-transparent pr-5 text-primary outline-none cursor-pointer"
                          name="currency"
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
                    name="price"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                  />
                </InputGroup>
                <Input
                  label="Quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue="1"
                />
              </div>

              <TextArea
                label="Why do you recommend this? (optional)"
                name="notes"
                placeholder="Enter a description..."
                rows={3}
              />

              <Input
                label="Your Name"
                name="suggestedByName"
                placeholder="Jane Doe"
                isRequired
              />
              <Input
                label="Your Email"
                name="suggestedByEmail"
                type="email"
                placeholder="jane@example.com"
                icon={Mail01}
                isRequired
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
                <Button type="submit" disabled={loading} className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
                  {loading ? "Submitting..." : "Suggest item"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
