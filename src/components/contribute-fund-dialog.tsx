"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import type { PaymentMethods } from "@/lib/types";

interface ContributeFundDialogProps {
  fund: {
    id: string;
    title: string;
    description: string | null;
    goal_amount: number | null;
    current_amount: number;
  };
  paymentMethods?: PaymentMethods;
}

export function ContributeFundDialog({
  fund,
  paymentMethods,
}: ContributeFundDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

    const result = await contributeToCashFund(formData);
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
        <DollarSign className="mr-1 h-3 w-3" />
        Contributed
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <DollarSign className="mr-1 h-3 w-3" />
          Contribute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contribute to &ldquo;{fund.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Pledge a contribution and send payment directly to the parents.
          </DialogDescription>
        </DialogHeader>

        {fund.goal_amount != null && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>${fund.current_amount.toFixed(0)} raised</span>
              <span>${fund.goal_amount.toFixed(0)} goal</span>
            </div>
            <Progress value={fundProgress} />
            {remaining != null && remaining > 0 && (
              <p className="text-xs text-tertiary mt-1">
                ${remaining.toFixed(0)} remaining
              </p>
            )}
          </div>
        )}

        <PaymentMethodsDisplay paymentMethods={paymentMethods} />

        <Separator />

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fundAmount">Amount ($)</Label>
            <Input
              id="fundAmount"
              name="amount"
              type="number"
              step="0.01"
              min="1"
              max={remaining ?? undefined}
              placeholder="25.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundName">Your Name</Label>
            <Input
              id="fundName"
              name="buyerName"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundEmail">Your Email</Label>
            <Input
              id="fundEmail"
              name="buyerEmail"
              type="email"
              placeholder="jane@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundMessage">Message (optional)</Label>
            <Textarea
              id="fundMessage"
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
              {loading ? "Contributing..." : "Contribute"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
