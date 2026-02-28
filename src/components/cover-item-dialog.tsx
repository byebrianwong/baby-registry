"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentMethodsDisplay } from "@/components/payment-methods-display";
import { coverParentPurchasedItem } from "@/lib/actions/registry";
import type { PaymentMethods } from "@/lib/types";

interface CoverItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
  };
  paymentMethods?: PaymentMethods;
}

export function CoverItemDialog({ item, paymentMethods }: CoverItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);

    const result = await coverParentPurchasedItem(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Button size="sm" disabled variant="secondary">
        <HandCoins className="mr-1 h-3 w-3" />
        Covered
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <HandCoins className="mr-1 h-3 w-3" />
          Cover This Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cover &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            The parents already bought this item. You can reimburse them by
            sending payment directly.
          </DialogDescription>
        </DialogHeader>

        {item.price && (
          <p className="text-lg font-semibold">${item.price.toFixed(2)}</p>
        )}

        <PaymentMethodsDisplay paymentMethods={paymentMethods} />

        <Separator />

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coverName">Your Name</Label>
            <Input
              id="coverName"
              name="buyerName"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverEmail">Your Email</Label>
            <Input
              id="coverEmail"
              name="buyerEmail"
              type="email"
              placeholder="jane@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverMessage">Message (optional)</Label>
            <Textarea
              id="coverMessage"
              name="message"
              placeholder="Happy to help!"
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
              {loading ? "Sending..." : "I'll Cover This"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
