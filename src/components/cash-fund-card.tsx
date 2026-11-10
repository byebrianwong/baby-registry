"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input, InputBase } from "@/components/base/input/input";
import { InputGroup, InputPrefix } from "@/components/base/input/input-group";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateCashFund, deleteCashFund } from "@/lib/actions/registry";
import { Tag } from "@/components/ui/tag";
import { GiftDetailModal, type Purchase } from "@/components/gift-detail-modal";
import { formatDollars, formatPrice } from "@/lib/money";

interface CashFundCardProps {
  fund: {
    id: string;
    title: string;
    description: string | null;
    goal_amount: number | null;
    current_amount: number;
  };
  registryId: string;
  highlightId?: string;
  purchases?: Purchase[];
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export function CashFundCard({ fund, registryId, highlightId, purchases }: CashFundCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [giftDetailOpen, setGiftDetailOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightId === fund.id;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const fundProgress =
    fund.goal_amount && fund.goal_amount > 0
      ? (fund.current_amount / fund.goal_amount) * 100
      : 0;

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await updateCashFund(fund.id, registryId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setEditOpen(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${fund.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteCashFund(fund.id, registryId);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
    }
  };

  return (
    <>
      <Card
        ref={cardRef}
        className="py-0 gap-0 rounded-2xl cursor-pointer transition hover:shadow-md motion-safe:hover:-translate-y-0.5"
        style={isHighlighted ? { animation: "highlight-pulse 1.5s ease-in-out 3" } : undefined}
        onClick={() => setEditOpen(true)}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <h3 className="font-display font-semibold text-lg text-primary min-w-0 flex-1 break-words">
              {fund.title}
            </h3>
            {purchases && purchases.length > 0 && (
              <Tag
                variant="gifted"
                className="cursor-pointer hover:opacity-80 max-w-[55%] overflow-hidden text-ellipsis block shrink-0"
                onClick={(e) => { e.stopPropagation(); setGiftDetailOpen(true); }}
              >
                {purchases.length > 1
                  ? `${purchases[0].buyer_name} + ${purchases.length - 1} other${purchases.length > 2 ? "s" : ""} contributed`
                  : `${purchases[0].buyer_name} contributed`}
              </Tag>
            )}
          </div>
          {fund.description && (
            <p className="text-sm text-tertiary whitespace-pre-line">
              {fund.description}
            </p>
          )}
          {fund.goal_amount != null && fund.goal_amount > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span>{formatDollars(fund.current_amount)} raised</span>
                <span>{formatDollars(fund.goal_amount)} goal</span>
              </div>
              <Progress value={fundProgress} aria-label={`Amount raised for ${fund.title}`} />
              <span className="text-xs text-tertiary">
                {formatDollars(Math.max(0, fund.goal_amount - fund.current_amount))} remaining
              </span>
            </div>
          ) : fund.current_amount > 0 ? (
            <p className="text-sm">{formatDollars(fund.current_amount)} raised</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit gift fund</DialogTitle>
            <DialogDescription>
              Update the details for this fund.
            </DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <Input
              label="Fund Name"
              name="title"
              defaultValue={fund.title}
              isRequired
            />

            <TextArea
              label="Description (optional)"
              name="description"
              defaultValue={fund.description || ""}
              rows={3}
            />

            <InputGroup
              label="Goal Amount (optional)"
              name="goalAmount"
              defaultValue={fund.goal_amount != null ? fund.goal_amount.toFixed(2) : ""}
              prefix={currencySymbols[currency] || "$"}
              trailingAddon={
                <InputPrefix position="trailing">
                  <span className="relative inline-flex items-center">
                    <select
                      aria-label="Currency"
                      className="appearance-none bg-transparent pr-5 text-primary outline-none cursor-pointer max-sm:-my-2.5 max-sm:py-2.5"
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
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="0.00"
              />
            </InputGroup>

            {fund.current_amount > 0 && (
              <p className="text-sm text-tertiary">
                {formatPrice(fund.current_amount)} has been contributed so far.
              </p>
            )}

            {error && <p className="text-sm text-error-primary">{error}</p>}

            <DialogFooter sticky>
              <Button
                type="button"
                variant="destructive-outline"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Removing..." : "Delete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {purchases && purchases.length > 0 && (
        <GiftDetailModal
          open={giftDetailOpen}
          onOpenChange={setGiftDetailOpen}
          itemTitle={fund.title}
          purchases={purchases}
        />
      )}
    </>
  );
}
