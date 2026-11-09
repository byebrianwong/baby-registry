"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleHelp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import { submitRsvp, type RsvpInput } from "@/lib/actions/events";
import type { RsvpStatus } from "@/lib/events";
import { cx } from "@/lib/utils/cx";

type Answer = "yes" | "maybe" | "no";

const ANSWERS: { value: Answer; label: string; icon: typeof Check }[] = [
  { value: "yes", label: "Going", icon: Check },
  { value: "maybe", label: "Maybe", icon: CircleHelp },
  { value: "no", label: "Can't go", icon: X },
];

const SUMMARY: Record<Answer, string> = {
  yes: "You're going",
  maybe: "You might make it",
  no: "You can't make it",
};

export interface RsvpFormProps {
  slug: string;
  /** The guest from a personal link, or null for someone on the plain event link. */
  guest: { name: string; status: RsvpStatus; partySize: number; note: string | null } | null;
  token: string | null;
  /** Whether people without a personal link can RSVP. */
  openRsvp: boolean;
  maxPartySize: number;
  /** The event's day is over. */
  passed: boolean;
  submitAction?: (input: RsvpInput) => Promise<{ error: string | null; token?: string }>;
}

/** The RSVP box on the event page. */
export function RsvpForm({
  slug,
  guest,
  token,
  openRsvp,
  maxPartySize,
  passed,
  submitAction = submitRsvp,
}: RsvpFormProps) {
  const router = useRouter();
  // The answer just sent, shown until the refreshed page brings it back.
  const [saved, setSaved] = useState<{ status: Answer; partySize: number; note: string | null } | null>(null);
  const current =
    saved ??
    (guest && guest.status !== "pending"
      ? { status: guest.status as Answer, partySize: guest.partySize, note: guest.note }
      : null);
  const responded = current?.status ?? null;
  const [editing, setEditing] = useState(!responded);
  const [answer, setAnswer] = useState<Answer | null>(responded);
  const [partySize, setPartySize] = useState(String(Math.max(guest?.partySize ?? 1, 1)));
  const [note, setNote] = useState(guest?.note ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const heading = guest ? `Hi ${guest.name}, can you make it?` : "Can you make it?";

  if (!guest && !openRsvp) {
    return (
      <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
        <h2 id="rsvp-heading" className="font-display text-xl font-semibold">RSVP</h2>
        <p className="mt-1 text-tertiary">To RSVP, open the link in your invitation email.</p>
      </section>
    );
  }

  if (current && !editing) {
    const size = current.partySize;
    return (
      <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
        <h2 id="rsvp-heading" className="font-display text-xl font-semibold">
          {SUMMARY[current.status]}
          {current.status !== "no" && size > 1 ? ` (${size} people)` : ""}
        </h2>
        <p className="mt-1 text-tertiary">
          {current.status === "no" ? "Thanks for letting the host know." : "Thanks! The host has your RSVP."}
        </p>
        {current.note && <p className="mt-3 text-sm whitespace-pre-line text-secondary">Your note: {current.note}</p>}
        {!passed && (
          <Button variant="outline" className="mt-4" onClick={() => setEditing(true)}>
            Change RSVP
          </Button>
        )}
      </section>
    );
  }

  if (passed) {
    return (
      <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
        <h2 id="rsvp-heading" className="font-display text-xl font-semibold">This event has passed</h2>
        <p className="mt-1 text-tertiary">RSVPs are closed.</p>
      </section>
    );
  }

  const showPartySize = maxPartySize > 1 && (answer === "yes" || answer === "maybe");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer) {
      setError("Choose Going, Maybe or Can't go.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await submitAction({
      slug,
      token,
      name: guest ? undefined : name,
      email: guest ? undefined : email,
      status: answer,
      partySize: Number(partySize),
      note,
    });
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    // Someone on the plain link now has their own: switch to it, so the page
    // shows their answer and the address bar holds a link they can come back to.
    if (!token && result.token) {
      router.replace(`/e/${slug}?g=${encodeURIComponent(result.token)}`, { scroll: false });
    }
    router.refresh();
    setSaved({
      status: answer,
      partySize: answer === "no" ? 0 : showPartySize ? Number(partySize) : 1,
      note: note.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
      <h2 id="rsvp-heading" className="font-display text-xl font-semibold">{heading}</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div role="group" aria-label="Your answer" className="grid grid-cols-3 gap-2">
          {ANSWERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={answer === value}
              onClick={() => {
                setAnswer(value);
                setError("");
              }}
              className={cx(
                "flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:flex-row sm:gap-1.5",
                answer === value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-secondary text-primary hover:border-primary",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {!guest && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Your name" name="name" value={name} onChange={setName} isRequired autoComplete="name" />
            <Input
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              isRequired
              autoComplete="email"
              hint="We'll send your RSVP and a link to change it."
            />
          </div>
        )}

        {showPartySize && (
          <NativeSelect
            label="How many people, including you?"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            options={Array.from({ length: maxPartySize }, (_, i) => ({
              value: String(i + 1),
              label: i === 0 ? "Just me" : String(i + 1),
            }))}
          />
        )}

        <TextArea
          label="Note to the host (optional)"
          value={note}
          onChange={setNote}
          rows={2}
          maxLength={1000}
          placeholder={answer === "no" ? "Sorry to miss it!" : "Can't wait!"}
        />

        {error && (
          <p role="alert" className="text-sm text-error-primary">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            <span className="inline-flex items-center gap-1.5">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Sending…" : "Send RSVP"}
            </span>
          </Button>
          {responded && (
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
