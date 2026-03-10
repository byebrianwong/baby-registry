"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, InputBase } from "@/components/base/input/input";
import { InputGroup } from "@/components/base/input/input-group";
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

export function AddCashFundDialog({ registryId }: AddCashFundDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
            placeholder="Help us stock up on diapers..."
            rows={3}
          />

          <InputGroup
            label="Goal Amount (optional)"
            name="goalAmount"
            prefix="$"
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
              className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
            >
              {loading ? "Creating..." : "Create fund"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
