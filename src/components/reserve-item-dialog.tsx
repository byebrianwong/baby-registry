"use client";

import { useState } from "react";
import { Gift, Check, ExternalLink } from "lucide-react";
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

type DialogAction = (
  formData: FormData
) => Promise<{ error?: string; shippingAddress?: string } | undefined>;

interface ReserveItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
    quantity_needed: number;
    quantity_fulfilled: number;
    external_url?: string | null;
  };
  parentName?: string;
  action?: DialogAction;
  alreadyPurchased?: boolean;
  /** Only set for visitors the server has matched to a purchase on this
   *  registry; a fresh reservation gets it back from the action instead. */
  shippingAddress?: string;
}

function getDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ReserveItemDialog({ item, parentName = "The Registry Owner", action, alreadyPurchased, shippingAddress }: ReserveItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(alreadyPurchased ?? false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [reservedShippingAddress, setReservedShippingAddress] = useState<string>();

  const remaining = item.quantity_needed - item.quantity_fulfilled;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);

    const result = await (action ?? reserveItem)(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setReservedShippingAddress(result?.shippingAddress);
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
          shippingAddress={reservedShippingAddress ?? shippingAddress}
          shopUrl={item.external_url || undefined}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
          <span className="inline-flex items-center gap-1.5"><Gift className="h-4 w-4 shrink-0" />Gift this</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Purchase and Gift &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Let {parentName} know you&apos;re getting this gift. No account
            required.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {item.external_url && (
            <Button variant="outline" className="w-full" asChild>
              <a href={item.external_url} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Purchase from {getDomainName(item.external_url)}
                </span>
              </a>
            </Button>
          )}
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
              hint={`${remaining} of ${item.quantity_needed} available to gift`}
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
              {loading ? "Reserving..." : "Mark as purchased"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
