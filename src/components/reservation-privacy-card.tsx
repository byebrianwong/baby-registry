"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { updateReservationPrivacy } from "@/lib/actions/registry";
import type { ReservationPrivacy } from "@/lib/gifts";

type SaveAction = (
  registryId: string,
  input: { hide: boolean; forChild: boolean },
) => Promise<{ error?: string; success?: true }>;

/**
 * The registry settings card for "Hide what's been reserved from me" and
 * "I keep this list for my child" (see src/lib/gifts.ts). Only the owner can
 * change them. Co-managers see what the owner chose.
 */
export function ReservationPrivacyCard({
  registryId,
  isOwner,
  isPersonal,
  privacy,
  saveAction = updateReservationPrivacy,
  onSaved,
}: {
  registryId: string;
  isOwner: boolean;
  /** A personal list, not a baby registry. Only personal lists can be kept for a child. */
  isPersonal: boolean;
  privacy: ReservationPrivacy;
  /** Saves the choice. Stories pass a stand-in. */
  saveAction?: SaveAction;
  /** Called after a save, so the page can show or hide what depends on it. */
  onSaved?: (input: { hide: boolean; forChild: boolean }) => void;
}) {
  const [hide, setHide] = useState(privacy.hide_reservations === true && !privacy.for_child);
  const [forChild, setForChild] = useState(Boolean(privacy.for_child));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const turnedOnByExchange =
    privacy.hide_reservations === true && privacy.hide_reservations_source === "exchange";

  async function save() {
    setSaving(true);
    setError("");
    const input = { hide: forChild ? false : hide, forChild };
    const result = await saveAction(registryId, input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved?.(input);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const ownerHides = privacy.hide_reservations === true && !privacy.for_child;

  return (
    <Card>
      <CardHeader>
        <CardTitle>What&apos;s been reserved</CardTitle>
        <CardDescription>
          {isOwner
            ? "Choose whether you see what people reserve and pledge on this list."
            : "The owner chooses whether they see what people reserve and pledge."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOwner ? (
          <div className="space-y-4">
            <Checkbox
              isSelected={hide && !forChild}
              isDisabled={forChild}
              onChange={(value) => {
                setHide(value);
                setSaved(false);
              }}
              label="Hide what's been reserved from me"
              hint={
                <>
                  Every item shows as not yet reserved for you, and you don&apos;t get gift emails. Guests still see
                  what&apos;s taken, so nobody buys the same thing twice. Co-managers still see everything. When the
                  list is part of an event, you see what was given, and by whom, from the day after it. Or turn this
                  off any time to see everything.
                  {turnedOnByExchange && (
                    <> Regibee turned this on when you added this list to a gift exchange.</>
                  )}
                </>
              }
            />
            {isPersonal && (
              <Checkbox
                isSelected={forChild}
                onChange={(value) => {
                  setForChild(value);
                  setSaved(false);
                }}
                label="I keep this list for my child"
                hint="You always see what's been reserved, so you can plan, even when the list is in a gift exchange."
              />
            )}
            {error && <p className="text-sm text-error-primary">{error}</p>}
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-secondary">
            {ownerHides
              ? "The owner hides what's been reserved from themselves, so their gifts stay a surprise. You still see everything and get gift emails."
              : "Everyone who manages this list sees what's been reserved."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
