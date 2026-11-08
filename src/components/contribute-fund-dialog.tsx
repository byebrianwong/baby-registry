"use client";

import { useState } from "react";
import { DollarSign, ChevronDown, Check } from "lucide-react";
import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Input, InputBase } from "@/components/base/input/input";
import { InputGroup, InputPrefix } from "@/components/base/input/input-group";
import { TextArea } from "@/components/base/textarea/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentMethodsDisplay } from "@/components/payment-methods-display";
import { contributeToCashFund } from "@/lib/actions/registry";
import { CelebrationDialog } from "@/components/celebration-dialog";
import type { PaymentMethods } from "@/lib/types";

type DialogAction = (formData: FormData) => Promise<{ error: string } | undefined>;

interface ContributeFundDialogProps {
  fund: {
    id: string;
    title: string;
    description: string | null;
    goal_amount: number | null;
    current_amount: number;
  };
  paymentMethods?: PaymentMethods;
  parentName?: string;
  action?: DialogAction;
  alreadyPurchased?: boolean;
  previousAmount?: number;
  shippingAddress?: string;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export function ContributeFundDialog({
  fund,
  paymentMethods,
  parentName = "The parents",
  action,
  alreadyPurchased,
  previousAmount,
  shippingAddress,
}: ContributeFundDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(alreadyPurchased ?? false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [contributedAmount, setContributedAmount] = useState<number>(previousAmount ?? 0);
  const [currency, setCurrency] = useState("USD");

  const remaining =
    fund.goal_amount != null
      ? Math.max(0, fund.goal_amount - fund.current_amount)
      : null;

  const fundProgress =
    fund.goal_amount && fund.goal_amount > 0
      ? (fund.current_amount / fund.goal_amount) * 100
      : 0;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("fundId", fund.id);

    const result = await (action ?? contributeToCashFund)(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setContributedAmount(Number(formData.get("amount")) || 0);
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
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0" />Contributed</span>
          </Button>
          <button
            type="button"
            onClick={() => setShowCelebration(true)}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            View details
          </button>
        </div>
        <CelebrationDialog
          open={showCelebration}
          onClose={() => setShowCelebration(false)}
          itemTitle={fund.title}
          parentName={parentName}
          variant="contribute"
          amount={contributedAmount}
          paymentMethods={paymentMethods}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="!bg-mint-500 hover:!bg-mint-600 !ring-mint-500 !text-brand-900">
          <span className="inline-flex items-center gap-1.5"><DollarSign className="h-4 w-4 shrink-0" />Contribute</span>
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Contribute to &ldquo;{fund.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Pledge a contribution and send payment directly to the registry owner.
          </DialogDescription>
        </DialogHeader>

        {fund.goal_amount != null && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>${fund.current_amount.toFixed(0)} raised</span>
              <span>${fund.goal_amount.toFixed(0)} goal</span>
            </div>
            <Progress value={fundProgress} />
            {remaining != null && remaining > 0 && (
              <span className="text-xs">
                ${remaining.toFixed(0)} remaining
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 overflow-hidden rounded-xl px-4">
          {fund.goal_amount != null && (
            <p className="text-lg font-semibold">${fund.goal_amount.toFixed(0)}</p>
          )}
          <PaymentMethodsDisplay paymentMethods={paymentMethods} />
        </div>

        <form action={handleSubmit} className="space-y-4">
          <InputGroup
            label="Amount"
            prefix={currencySymbols[currency] || "$"}
            isRequired
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
              name="amount"
              type="number"
              step="0.01"
              min={1}
              max={remaining ?? undefined}
              placeholder="0.00"
            />
          </InputGroup>
          <Input
            label="Your Name"
            name="buyerName"
            placeholder="Alex Kim"
            isRequired
          />
          <Input
            label="Your Email"
            name="buyerEmail"
            type="email"
            placeholder="alex@example.com"
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
            <Button type="submit" disabled={loading}>
              {loading ? "Contributing..." : "Contribute"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
