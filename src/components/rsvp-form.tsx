"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleHelp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { submitRsvp, type RsvpInput } from "@/lib/actions/events";
import type { RsvpStatus } from "@/lib/events";
import { cx } from "@/lib/utils/cx";

type Answer = "yes" | "maybe" | "no";

const PARTY_ANSWERS: { value: Answer; label: string; icon: typeof Check }[] = [
  { value: "yes", label: "Going", icon: Check },
  { value: "maybe", label: "Maybe", icon: CircleHelp },
  { value: "no", label: "Can't go", icon: X },
];

// A gift exchange with no get-together asks only whether you're in.
const EXCHANGE_ANSWERS: { value: Answer; label: string; icon: typeof Check }[] = [
  { value: "yes", label: "I'm in", icon: Check },
  { value: "no", label: "Not this year", icon: X },
];

const SUMMARY: Record<Answer, string> = {
  yes: "You're going",
  maybe: "You might make it",
  no: "You can't make it",
};

export interface RsvpGuest {
  name: string;
  status: RsvpStatus;
  partySize: number;
  note: string | null;
  kidsCount?: number;
  inExchange?: boolean;
  wishlistUrl?: string | null;
  giftIdeas?: string | null;
  shippingAddress?: string | null;
}

export interface RsvpFormProps {
  slug: string;
  /** The guest from a personal link, or null for someone on the plain event link. */
  guest: RsvpGuest | null;
  token: string | null;
  /** Whether people without a personal link can RSVP. */
  openRsvp: boolean;
  maxPartySize: number;
  /** Ask how many of the party are kids. */
  askKids?: boolean;
  /** The event's gift exchange, when it has one. */
  exchange?: { mailed: boolean; drawn: boolean } | null;
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
  askKids = false,
  exchange = null,
  passed,
  submitAction = submitRsvp,
}: RsvpFormProps) {
  const router = useRouter();
  const exchangeOnly = Boolean(exchange?.mailed);
  // The answer just sent, shown until the refreshed page brings it back.
  const [saved, setSaved] = useState<{
    status: Answer;
    partySize: number;
    kidsCount: number;
    note: string | null;
    inExchange: boolean;
  } | null>(null);
  const current =
    saved ??
    (guest && guest.status !== "pending"
      ? {
          status: guest.status as Answer,
          partySize: guest.partySize,
          kidsCount: guest.kidsCount ?? 0,
          note: guest.note,
          inExchange: Boolean(guest.inExchange),
        }
      : null);
  const responded = current?.status ?? null;
  const [editing, setEditing] = useState(!responded);
  const [answer, setAnswer] = useState<Answer | null>(responded);
  const [partySize, setPartySize] = useState(String(Math.max(guest?.partySize ?? 1, 1)));
  const [kids, setKids] = useState(String(guest?.kidsCount ?? 0));
  const [note, setNote] = useState(guest?.note ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // New guests join the exchange unless they say otherwise.
  const [join, setJoin] = useState(guest?.status === "pending" || !guest ? true : Boolean(guest.inExchange));
  const [wishlistUrl, setWishlistUrl] = useState(guest?.wishlistUrl ?? "");
  const [giftIdeas, setGiftIdeas] = useState(guest?.giftIdeas ?? "");
  const [address, setAddress] = useState(guest?.shippingAddress ?? "");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const answers = exchangeOnly ? EXCHANGE_ANSWERS : PARTY_ANSWERS;
  const heading = exchangeOnly
    ? guest
      ? `Hi ${guest.name}, are you in?`
      : "Are you in?"
    : guest
      ? `Hi ${guest.name}, can you make it?`
      : "Can you make it?";

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
    const kidsText = askKids && current.kidsCount > 0 ? `, ${current.kidsCount} ${current.kidsCount === 1 ? "kid" : "kids"}` : "";
    return (
      <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
        <h2 id="rsvp-heading" className="font-display text-xl font-semibold">
          {exchangeOnly
            ? current.status === "yes"
              ? "You're in the gift exchange"
              : "You're sitting this one out"
            : `${SUMMARY[current.status]}${current.status !== "no" && size > 1 ? ` (${size} people${kidsText})` : ""}`}
        </h2>
        <p className="mt-1 text-tertiary">
          {current.status === "no" ? "Thanks for letting the host know." : "Thanks! The host has your answer."}
        </p>
        {exchange && !exchangeOnly && current.status !== "no" && (
          <p className="mt-2 text-sm text-secondary">
            {current.inExchange ? "You're in the gift exchange." : "You're not in the gift exchange."}
          </p>
        )}
        {exchange && current.inExchange && !exchange.drawn && (
          <p className="mt-1 text-sm text-tertiary">We&apos;ll email you who you&apos;re giving to when names are drawn.</p>
        )}
        {current.note && <p className="mt-3 text-sm whitespace-pre-line text-secondary">Your note: {current.note}</p>}
        {!passed && (
          <Button variant="outline" className="mt-4" onClick={() => setEditing(true)}>
            {exchange && current.inExchange ? "Change your answer or wishlist" : "Change RSVP"}
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

  const attending = answer === "yes" || answer === "maybe";
  const showPartySize = !exchangeOnly && maxPartySize > 1 && attending;
  const showKids = askKids && attending && !exchangeOnly;
  // After the draw nobody joins or leaves here, but people in it can still
  // update their wishlist and address.
  const alreadyIn = Boolean(guest?.inExchange);
  const canChooseJoin = Boolean(exchange) && !exchangeOnly && !exchange?.drawn && attending;
  const inExchange = exchange
    ? exchange.drawn
      ? alreadyIn
      : exchangeOnly
        ? answer === "yes"
        : attending && join
    : false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer) {
      setError(exchangeOnly ? "Choose I'm in or Not this year." : "Choose Going, Maybe or Can't go.");
      return;
    }
    if (exchange?.mailed && inExchange && !address.trim()) {
      setError("Add a shipping address, so your Secret Santa can mail your gift.");
      return;
    }
    setSending(true);
    setError("");
    const size = showPartySize ? Number(partySize) : 1;
    const result = await submitAction({
      slug,
      token,
      name: guest ? undefined : name,
      email: guest ? undefined : email,
      status: answer,
      partySize: size,
      kidsCount: showKids ? Math.min(Number(kids), size) : 0,
      note,
      exchange: exchange
        ? { join: inExchange, wishlistUrl, giftIdeas, shippingAddress: address }
        : undefined,
    });
    if (result.error) {
      setError(result.error);
      setSending(false);
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
      partySize: answer === "no" ? 0 : size,
      kidsCount: showKids ? Math.min(Number(kids), size) : 0,
      note: note.trim() || null,
      inExchange,
    });
    setSending(false);
    setEditing(false);
  };

  return (
    <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
      <h2 id="rsvp-heading" className="font-display text-xl font-semibold">{heading}</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div
          role="group"
          aria-label="Your answer"
          className={cx("grid gap-2", answers.length === 3 ? "grid-cols-3" : "grid-cols-2")}
        >
          {answers.map(({ value, label, icon: Icon }) => (
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

        {(showPartySize || showKids) && (
          // Side by side only when both show. Alone, the dropdown keeps the full width.
          <div className={cx("grid gap-4", showPartySize && showKids && "sm:grid-cols-2")}>
            {showPartySize && (
              <NativeSelect
                label="How many people, including you?"
                value={partySize}
                onChange={(e) => {
                  setPartySize(e.target.value);
                  if (Number(kids) > Number(e.target.value)) setKids(e.target.value);
                }}
                options={Array.from({ length: maxPartySize }, (_, i) => ({
                  value: String(i + 1),
                  label: i === 0 ? "Just me" : String(i + 1),
                }))}
              />
            )}
            {showKids && (
              <NativeSelect
                label="How many are kids?"
                value={kids}
                onChange={(e) => setKids(e.target.value)}
                options={Array.from({ length: (showPartySize ? Number(partySize) : 1) + 1 }, (_, i) => ({
                  value: String(i),
                  label: i === 0 ? "None" : String(i),
                }))}
              />
            )}
          </div>
        )}

        {exchange && (attending || exchangeOnly) && answer !== "no" && (
          <fieldset className="flex flex-col gap-4 rounded-xl bg-mint-50 p-4">
            <legend className="sr-only">Gift exchange</legend>
            {canChooseJoin ? (
              <Checkbox
                isSelected={join}
                onChange={setJoin}
                label={<span className="font-medium">Join the gift exchange</span>}
                hint="You'll draw one name and give that person a gift."
              />
            ) : exchange.drawn && !alreadyIn ? (
              <p className="text-sm text-secondary">
                Names for the gift exchange have been drawn, so it&apos;s closed. Ask the host if you&apos;d like to join.
              </p>
            ) : (
              <p className="font-medium text-primary">Your gift exchange details</p>
            )}
            {inExchange && (
              <>
                <Input
                  label="Your wishlist (optional)"
                  value={wishlistUrl}
                  onChange={setWishlistUrl}
                  placeholder="regibee.com/r/your-wishlist or any store's list"
                  hint="Paste a link to your Regibee wishlist or a list at any store. Only the person who draws you sees it."
                />
                <TextArea
                  label="Gift ideas (optional)"
                  value={giftIdeas}
                  onChange={setGiftIdeas}
                  rows={2}
                  maxLength={1000}
                  placeholder="Cozy socks (size M), anything with cats, a good mystery novel"
                />
                {exchange.mailed && (
                  <TextArea
                    label="Shipping address"
                    value={address}
                    onChange={setAddress}
                    rows={3}
                    maxLength={300}
                    isRequired
                    placeholder={"Your name\n123 Main St\nSan Francisco, CA 94102"}
                    hint="Only the person who draws you sees it."
                  />
                )}
              </>
            )}
          </fieldset>
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
          <Button type="submit" disabled={sending}>
            <span className="inline-flex items-center gap-1.5">
              {sending && <Loader2 className="size-4 animate-spin" />}
              {sending ? "Sending…" : exchangeOnly ? "Send" : "Send RSVP"}
            </span>
          </Button>
          {responded && (
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={sending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
