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
      <Button size="sm" onClick={handleAccept} disabled={loading}>
        <Plus className="h-3 w-3 mr-1" />
        Add to registry
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDecline}
        disabled={loading}
      >
        Decline
      </Button>
    </div>
  );
}
