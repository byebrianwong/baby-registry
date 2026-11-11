"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { planEventAgain } from "@/lib/actions/events";

/**
 * "Plan it again": copies the event a year later with the same guests,
 * co-hosts, registries and gift exchange settings, then opens it for editing.
 */
export function PlanAgainButton({
  eventId,
  planAction = planEventAgain,
}: {
  eventId: string;
  planAction?: (eventId: string) => Promise<{ error: string } | { error: null; id: string }>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setError("");
          const result = await planAction(eventId);
          if (result.error !== null) {
            setError(result.error);
            setSaving(false);
            return;
          }
          router.push(`/dashboard/events/${result.id}/edit`);
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Repeat className="size-4" />}
          Plan it again
        </span>
      </Button>
      <p className="text-xs text-tertiary">
        A copy a year later, with the same guests and gift settings. A gift exchange avoids this year&apos;s pairs.
      </p>
      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}
    </div>
  );
}
