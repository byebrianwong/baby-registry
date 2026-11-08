"use client";

import { useState } from "react";
import { DollarSign, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, InputBase } from "@/components/base/input/input";
import { InputGroup, InputPrefix } from "@/components/base/input/input-group";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addCashFund } from "@/lib/actions/registry";

interface AddCashFundDialogProps {
  registryId: string;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export function AddCashFundDialog({ registryId }: AddCashFundDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await addCashFund(registryId, formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <span className="inline-flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 shrink-0" />
            Add Fund
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Create gift fund</DialogTitle>
          <DialogDescription>
            Let guests contribute cash toward a specific goal.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <Input
            label="Fund Name"
            name="title"
            placeholder="e.g., Diaper Fund"
            isRequired
          />

          <TextArea
            label="Description (optional)"
            name="description"
            placeholder="What's this fund for?"
            rows={3}
          />

          <InputGroup
            label="Goal Amount (optional)"
            name="goalAmount"
            prefix={currencySymbols[currency] || "$"}
            trailingAddon={
              <InputPrefix position="trailing">
                <span className="relative inline-flex items-center">
                  <select
                    aria-label="Currency"
                    className="appearance-none bg-transparent pr-5 text-primary outline-none cursor-pointer"
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
              step="0.01"
              min={0}
              placeholder="0.00"
            />
          </InputGroup>

          {error && <p className="text-sm text-error-primary">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create fund"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
