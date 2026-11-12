"use client";

import { useState } from "react";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { setBirthdayEmails } from "@/lib/actions/gift-profile";
import { BIRTHDAY_REMINDER_DAYS } from "@/lib/gift-profile";

/**
 * The Account page switch for birthday reminder emails. It saves as soon as
 * it changes, since the link at the bottom of those emails lands here.
 */
export function BirthdayEmailsSetting({
  initial,
  action = setBirthdayEmails,
}: {
  initial: boolean;
  /** Saves the choice. Stories and the demo pass a stand-in. */
  action?: (on: boolean) => Promise<{ success?: boolean; error?: string | null }>;
}) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function change(next: boolean) {
    setOn(next);
    setSaving(true);
    setError("");
    const result = await action(next);
    if (result?.error) {
      setOn(!next);
      setError(result.error);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <Checkbox
        isSelected={on}
        isDisabled={saving}
        onChange={change}
        label="Email me before birthdays"
        hint={`${BIRTHDAY_REMINDER_DAYS} days before the birthday of someone you follow, if they approved you and added their birthday.`}
      />
      {error && <p className="text-sm text-error-primary">{error}</p>}
    </div>
  );
}
