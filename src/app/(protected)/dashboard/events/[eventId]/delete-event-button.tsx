"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/lib/actions/events";

/** Deletes the event and its guest list, after asking. Only the owner sees it. */
export function DeleteEventButton({ eventId, guestCount }: { eventId: string; guestCount: number }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <span className="inline-flex items-center gap-1.5 text-error-primary">
          <Trash2 className="size-4" />
          Delete event
        </span>
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-error p-4">
      <p className="text-sm font-medium text-primary">Delete this event?</p>
      <p className="mt-1 text-sm text-tertiary">
        {guestCount > 0
          ? `The event page stops working and the guest list of ${guestCount} is deleted. This can't be undone.`
          : "The event page stops working. This can't be undone."}
      </p>
      {error && <p className="mt-2 text-sm text-error-primary">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            const result = await deleteEvent(eventId);
            // On success the action redirects, so only errors come back.
            if (result?.error) {
              setError(result.error);
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Deleting…" : "Delete event"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
