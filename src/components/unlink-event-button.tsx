"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unlinkRegistryFromEvent } from "@/lib/actions/events";

/**
 * Takes this registry off someone else's event, on the registry's dashboard.
 * Asks once before doing it, since the event's guests stop seeing the
 * registry on the invitation.
 */
export function UnlinkEventButton({
  eventId,
  registryId,
  unlinkAction = unlinkRegistryFromEvent,
}: {
  eventId: string;
  registryId: string;
  unlinkAction?: (eventId: string, registryId: string) => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="cursor-pointer text-sm font-medium text-tertiary underline-offset-2 hover:text-primary hover:underline max-sm:min-h-11"
      >
        Unlink
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-sm">
      <span className="text-secondary">Guests won&apos;t see this registry on the invitation.</span>
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const result = await unlinkAction(eventId, registryId);
          if (result.error) {
            setError(result.error);
            setSaving(false);
            return;
          }
          router.refresh();
        }}
        className="cursor-pointer font-medium text-error-primary hover:underline max-sm:min-h-11"
      >
        {saving ? "Unlinking…" : "Unlink"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="cursor-pointer font-medium text-tertiary hover:underline max-sm:min-h-11"
      >
        Cancel
      </button>
      {error && <span role="alert" className="text-error-primary">{error}</span>}
    </span>
  );
}
