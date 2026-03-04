"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptSuggestion, declineSuggestion } from "@/lib/actions/registry";

interface SuggestionActionsProps {
  suggestionId: string;
  registryId: string;
}

export function SuggestionActions({
  suggestionId,
  registryId,
}: SuggestionActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("suggestionId", suggestionId);
    formData.set("registryId", registryId);
    await acceptSuggestion(formData);
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("suggestionId", suggestionId);
    formData.set("registryId", registryId);
    await declineSuggestion(formData);
    setLoading(false);
  };

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        variant="destructive-outline"
        size="sm"
        onClick={handleDecline}
        disabled={loading}
      >
        Decline
      </Button>
      <Button
        size="sm"
        onClick={handleAccept}
        disabled={loading}
        className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
      >
        <span className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4 shrink-0" />
          Add to registry
        </span>
      </Button>
    </div>
  );
}
