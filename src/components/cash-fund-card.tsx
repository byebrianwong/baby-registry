"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input, InputBase } from "@/components/base/input/input";
import { InputGroup } from "@/components/base/input/input-group";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateCashFund, deleteCashFund } from "@/lib/actions/registry";

interface CashFundCardProps {
  fund: {
    id: string;
    title: string;
    description: string | null;
    goal_amount: number | null;
    current_amount: number;
  };
  registryId: string;
}

export function CashFundCard({ fund, registryId }: CashFundCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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
        className="py-0 gap-0 rounded-xl cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => setEditOpen(true)}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg text-[#181d27]">
              {fund.title}
            </h3>
            <DollarSign className="h-5 w-5 text-[#09c69a] shrink-0" />
          </div>
          {fund.description && (
            <p className="text-sm text-[#535862] whitespace-pre-line">
              {fund.description}
            </p>
          )}
          {fund.goal_amount != null && fund.goal_amount > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span>${fund.current_amount.toFixed(0)} raised</span>
                <span>${fund.goal_amount.toFixed(0)} goal</span>
              </div>
              <Progress value={fundProgress} />
              <span className="text-xs text-tertiary">
                ${Math.max(0, fund.goal_amount - fund.current_amount).toFixed(0)} remaining
              </span>
            </div>
          ) : fund.current_amount > 0 ? (
            <p className="text-sm">${fund.current_amount.toFixed(0)} raised</p>
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
              defaultValue={fund.goal_amount?.toString() || ""}
              prefix="$"
            >
              <InputBase
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
              />
            </InputGroup>

            {fund.current_amount > 0 && (
              <p className="text-sm text-tertiary">
                ${fund.current_amount.toFixed(2)} has been contributed so far.
              </p>
            )}

            {error && <p className="text-sm text-error-primary">{error}</p>}

            <div className="flex justify-end gap-2">
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
                className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
              >
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
