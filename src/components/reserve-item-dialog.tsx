"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { reserveItem } from "@/lib/actions/registry";

interface ReserveItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
    quantity_needed: number;
    quantity_fulfilled: number;
  };
}

export function ReserveItemDialog({ item }: ReserveItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);

    const result = await reserveItem(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" disabled>
            Reserved
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thank you!</DialogTitle>
            <DialogDescription>
              You&apos;ve reserved &ldquo;{item.title}&rdquo;. The parents will be
              notified.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Gift className="mr-1 h-3 w-3" />
          I&apos;ll Get This
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Let the parents know you&apos;re getting this gift. No account
            required.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buyerName">Your Name</Label>
            <Input
              id="buyerName"
              name="buyerName"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerEmail">Your Email</Label>
            <Input
              id="buyerEmail"
              name="buyerEmail"
              type="email"
              placeholder="jane@example.com"
              required
            />
          </div>
          {remaining > 1 && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (up to {remaining})</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={remaining}
                defaultValue="1"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Congratulations!"
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
              {loading ? "Reserving..." : "Reserve Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
