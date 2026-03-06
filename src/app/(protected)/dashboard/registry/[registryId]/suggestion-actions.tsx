"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptSuggestion, acceptOffering, declineSuggestion } from "@/lib/actions/registry";

type SuggestionStatus = "pending" | "offering" | "added" | "accepted" | "declined";

interface SuggestionActionsProps {
  suggestionId: string;
  registryId: string;
  status: SuggestionStatus;
}

export function SuggestionActions({
  suggestionId,
  registryId,
  status,
}: SuggestionActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleAddToRegistry = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("suggestionId", suggestionId);
    formData.set("registryId", registryId);
    await acceptSuggestion(formData);
    setLoading(false);
  };

  const handleAcceptOffering = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("suggestionId", suggestionId);
    formData.set("registryId", registryId);
    await acceptOffering(formData);
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

  if (status === "pending") {
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
          onClick={handleAddToRegistry}
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

  if (status === "offering") {
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
          onClick={handleAcceptOffering}
          disabled={loading}
          className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
        >
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 shrink-0" />
            Accept offering
          </span>
        </Button>
      </div>
    );
  }

  return null;
}
