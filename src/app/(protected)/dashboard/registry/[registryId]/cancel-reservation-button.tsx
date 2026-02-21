"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelReservation } from "@/lib/actions/registry";

interface CancelReservationButtonProps {
  purchaseId: string;
  registryId: string;
}

export function CancelReservationButton({
  purchaseId,
  registryId,
}: CancelReservationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Cancel this reservation? The item will become available again."))
      return;
    setLoading(true);
    await cancelReservation(purchaseId, registryId);
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={loading}
      className="text-destructive hover:text-destructive shrink-0"
    >
      <X className="h-3 w-3 mr-1" />
      {loading ? "..." : "Cancel"}
    </Button>
  );
}
