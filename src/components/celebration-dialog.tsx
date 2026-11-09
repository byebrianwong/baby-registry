"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentMethodsDisplay } from "@/components/payment-methods-display";
import { formatPrice } from "@/lib/money";
import type { PaymentMethods } from "@/lib/types";

interface CelebrationDialogProps {
  open: boolean;
  onClose: () => void;
  itemTitle: string;
  parentName: string;
  /** Gifts of regular items finish in the reserve dialog's own last step. */
  variant: "cover" | "contribute";
  amount?: number;
  shippingAddress?: string;
  paymentMethods?: PaymentMethods;
  shopUrl?: string;
}

function getMessage(
  variant: CelebrationDialogProps["variant"],
  itemTitle: string,
  parentName: string,
  amount?: number
) {
  switch (variant) {
    case "cover":
      return `You're gifting "${itemTitle}"! ${parentName} will really appreciate it. ❤️`;
    case "contribute":
      return `You contributed ${formatPrice(amount ?? 0)} to "${itemTitle}"! ${parentName} will really appreciate it. ❤️`;
  }
}

export function CelebrationDialog({
  open,
  onClose,
  itemTitle,
  parentName,
  variant,
  amount,
  shippingAddress,
  paymentMethods,
  shopUrl,
}: CelebrationDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    const defaults = {
      spread: 60,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30,
      // Mint, teal, sunshine, coral and blush from the brand palette
      // (src/styles/theme.css). canvas-confetti needs literal hex values.
      colors: ["#09c69a", "#004659", "#fae421", "#fe4c4d", "#f9b8b9"],
    };

    // Fire from left
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.6 }, angle: 60 });
    // Fire from right
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.6 }, angle: 120 });
  }, [open]);

  const handleCopy = () => {
    if (!shippingAddress) return;
    navigator.clipboard.writeText(shippingAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent showCloseButton={false} className="text-center sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <img
            src="/hero/panda.svg"
            alt="Celebration panda"
            className="h-28 w-28"
            style={{ animation: "celebration-bounce 1.2s ease-in-out infinite" }}
          />
          {/* DialogTitle names the dialog for screen readers. */}
          <DialogTitle
            className="text-xl font-bold text-primary"
            style={{ animation: "celebration-fade-in 0.5s ease-out 0.2s both" }}
          >
            Thank you!
          </DialogTitle>
          <p
            className="text-secondary"
            style={{ animation: "celebration-fade-in 0.5s ease-out 0.4s both" }}
          >
            {getMessage(variant, itemTitle, parentName, amount)}
          </p>

          {shopUrl && (
            <Button
              variant="outline"
              asChild
              className="w-full"
              style={{ animation: "celebration-fade-in 0.5s ease-out 0.45s both" }}
            >
              <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Purchase this item
                </span>
              </a>
            </Button>
          )}

          {paymentMethods && (paymentMethods.venmo || paymentMethods.paypal || paymentMethods.zelle) ? (
            <div
              className="w-full rounded-lg border border-primary bg-secondary p-4 text-left"
              style={{ animation: "celebration-fade-in 0.5s ease-out 0.5s both" }}
            >
              <PaymentMethodsDisplay paymentMethods={paymentMethods} />
            </div>
          ) : shippingAddress ? (
            <div
              className="w-full rounded-lg border border-primary bg-secondary p-4 text-left"
              style={{ animation: "celebration-fade-in 0.5s ease-out 0.5s both" }}
            >
              <p className="text-xs font-medium text-tertiary mb-1">Ship to:</p>
              <p className="text-sm text-primary whitespace-pre-line">{shippingAddress}</p>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy address
                  </>
                )}
              </button>
            </div>
          ) : null}

          <Button
            onClick={onClose}
            className="mt-2"
            style={{ animation: "celebration-fade-in 0.5s ease-out 0.6s both" }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
