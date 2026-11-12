"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptListRequest } from "@/lib/actions/events";

/** Makes the list the host asked for, then opens it. */
export function MakeListButton({ token, label }: { token: string; label: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const make = async () => {
    setSaving(true);
    setError("");
    const result = await acceptListRequest(token);
    if (result.error !== null) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/dashboard/registry/${result.registryId}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={make} disabled={saving}>
        <span className="inline-flex items-center gap-1.5">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Making it…" : label}
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
