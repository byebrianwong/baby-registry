"use client";

import { useState } from "react";
import { Gift, Check } from "lucide-react";
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
import { reserveItem } from "@/lib/actions/registry";
import { CelebrationDialog } from "@/components/celebration-dialog";

type DialogAction = (formData: FormData) => Promise<{ error: string } | undefined>;

interface ReserveItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
    quantity_needed: number;
    quantity_fulfilled: number;
  };
  parentName?: string;
  action?: DialogAction;
  alreadyPurchased?: boolean;
  shippingAddress?: string;
}

export function ReserveItemDialog({ item, parentName = "The parents", action, alreadyPurchased, shippingAddress }: ReserveItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(alreadyPurchased ?? false);
  const [showCelebration, setShowCelebration] = useState(false);

  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);

    const result = await (action ?? reserveItem)(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setShowCelebration(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button disabled variant="secondary">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />Reserved</span>
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
          variant="reserve"
          shippingAddress={shippingAddress}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
          <span className="inline-flex items-center gap-1.5"><Gift className="h-4 w-4 shrink-0" />Mark as purchased</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Mark &ldquo;{item.title}&rdquo; as purchased</DialogTitle>
          <DialogDescription>
            Let the parents know you&apos;re getting this gift. No account
            required.
          </DialogDescription>
        </DialogHeader>
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
          {item.quantity_needed > 1 && (
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              min={1}
              max={remaining}
              defaultValue="1"
              hint={`${remaining} of ${item.quantity_needed} still needed`}
            />
          )}
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
              {loading ? "Reserving..." : "I'm gifting this"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
