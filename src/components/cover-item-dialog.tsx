"use client";

import { useState } from "react";
import { HandCoins, Check } from "lucide-react";
import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
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
import { CelebrationDialog } from "@/components/celebration-dialog";
import type { PaymentMethods } from "@/lib/types";

type DialogAction = (formData: FormData) => Promise<{ error: string } | undefined>;

interface CoverItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
  };
  paymentMethods?: PaymentMethods;
  parentName?: string;
  action?: DialogAction;
  alreadyPurchased?: boolean;
  isCovered?: boolean;
  shippingAddress?: string;
}

export function CoverItemDialog({ item, paymentMethods, parentName = "The Registry Owner", action, alreadyPurchased, isCovered, shippingAddress }: CoverItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(alreadyPurchased ?? false);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);

    const result = await (action ?? coverParentPurchasedItem)(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setShowCelebration(true);
    }
    setLoading(false);
  };

  // Someone else already covered all quantities — just show disabled button
  if (!success && isCovered) {
    return (
      <Button disabled variant="secondary">
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />Covered</span>
      </Button>
    );
  }

  if (success) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button disabled variant="secondary">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />Covered</span>
          </Button>
          <button
            type="button"
            onClick={() => setShowCelebration(true)}
            className="text-xs font-medium text-[#004659] hover:underline"
          >
            View details
          </button>
        </div>
        <CelebrationDialog
          open={showCelebration}
          onClose={() => setShowCelebration(false)}
          itemTitle={item.title}
          parentName={parentName}
          variant="cover"
          paymentMethods={paymentMethods}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="!bg-[#09c69a] hover:!bg-[#08b38b] !ring-[#09c69a] !text-white">
          <span className="inline-flex items-center gap-1.5"><HandCoins className="h-4 w-4 shrink-0" />Gift this</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Gift &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Great taste! {parentName} found a deal for this one and now it&apos;s
            on its way to baby. Gift this item by sending payment directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 overflow-hidden rounded-xl px-4">
          {item.price && (
            <p className="text-lg font-semibold">${item.price.toFixed(2)}</p>
          )}
          <PaymentMethodsDisplay paymentMethods={paymentMethods} />
        </div>

        <form action={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            name="buyerName"
            placeholder="Jane Doe"
            isRequired
          />
          <Input
            label="Your Email"
            name="buyerEmail"
            type="email"
            placeholder="jane@example.com"
            icon={Mail01}
            isRequired
          />
          <TextArea
            label="Message (optional)"
            name="message"
            placeholder="Congratulations!"
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
            <Button type="submit" disabled={loading} className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
              {loading ? "Sending..." : "Mark as covered and gifted"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
