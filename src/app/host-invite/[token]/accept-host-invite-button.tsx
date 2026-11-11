"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptCoHostInvite } from "@/lib/actions/events";

export function AcceptHostInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setSaving(true);
    setError("");
    const result = await acceptCoHostInvite(token);
    if (result.error !== null) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/dashboard/events/${result.eventId}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={accept} disabled={saving}>
        <span className="inline-flex items-center gap-1.5">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Joining…" : "Co-host this event"}
        </span>
      </Button>
      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}
    </div>
  );
}
