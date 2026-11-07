"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface Purchase {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  quantity: number;
  amount: number | null;
  message: string | null;
  status: string;
  created_at: string;
  registry_item_id: string | null;
  cash_fund_id: string | null;
  registry_items?: { is_parent_purchased?: boolean; price?: number | null } | null;
}

function getTagStyle(purchase: Purchase) {
  if (purchase.status === "cancelled") {
    return {
      className: "bg-error-primary/10 border-error-primary/20 text-error-primary",
      label: "Cancelled",
    };
  }
  if (purchase.cash_fund_id) {
    return {
      className: "bg-mint-500 border-mint-500 text-primary",
      label: "Contribution",
    };
  }
  if (purchase.registry_items?.is_parent_purchased) {
    return {
      className: "bg-mint-200 border-mint-200 text-primary",
      label: "Covered by guest",
    };
  }
  return {
    className: "bg-sunshine-100 border-sunshine-100 text-primary",
    label: "Purchased by guest",
  };
}

interface GiftDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  purchases: Purchase[];
}

export function GiftDetailModal({ open, onOpenChange, itemTitle, purchases }: GiftDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Gifts for &ldquo;{itemTitle}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {purchases.map((purchase) => {
            const tag = getTagStyle(purchase);
            const displayAmount = purchase.cash_fund_id
              ? purchase.amount
              : purchase.registry_items?.price;

            return (
              <div
                key={purchase.id}
                className={`rounded-lg border p-3 space-y-2 ${purchase.status === "cancelled" ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{purchase.buyer_name}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tag.className}`}
                  >
                    {tag.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-secondary">
                  {displayAmount != null && (
                    <span className="font-semibold text-sm">${Number(displayAmount).toFixed(2)}</span>
                  )}
                  {purchase.buyer_email && <span>{purchase.buyer_email}</span>}
                  <span>
                    {new Date(purchase.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {purchase.message && (
                  <p className="text-sm text-secondary whitespace-pre-line">
                    &ldquo;{purchase.message}&rdquo;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
