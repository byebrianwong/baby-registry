"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Separator } from "@/components/ui/separator";
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
}

export function SuggestItemDialog({ registryId }: SuggestItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("registryId", registryId);

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
      <DialogContent>
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
              <DialogTitle>Suggest an Item</DialogTitle>
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
              <Input
                label="Link (optional)"
                name="externalUrl"
                type="url"
                placeholder="https://example.com/item"
              />
              <Input
                label="Estimated Price (optional)"
                name="price"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
              />
              <TextArea
                label="Why do you recommend this?"
                name="notes"
                placeholder="I loved this for my baby..."
                rows={3}
              />

              <Separator />

              <Input
                label="Your Name"
                name="suggestedByName"
                placeholder="Jane Doe"
                isRequired
              />
              <Input
                label="Your Email (optional)"
                name="suggestedByEmail"
                type="email"
                placeholder="jane@example.com"
                icon={Mail01}
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
                  {loading ? "Submitting..." : "Submit Suggestion"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
