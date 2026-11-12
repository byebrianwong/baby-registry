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
import {
  MAX_CLAIM_NOTE_LENGTH,
  describeClaim,
  formatSlotDate,
  rowIsOpen,
  spotsLabel,
  type GuestSignupRow,
} from "@/lib/signups";
import {
  answerLabel,
  answerLines,
  plusOneCount,
  readAnswers,
  type RsvpAnswers,
  type RsvpQuestion,
} from "@/lib/rsvp-questions";
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

// A meal train has no get-together either: guests say whether they can help.
const MEAL_TRAIN_ANSWERS: { value: Answer; label: string; icon: typeof Check }[] = [
  { value: "yes", label: "I can help", icon: Check },
  { value: "no", label: "Not this time", icon: X },
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
  /** Their answers to the host's questions. */
  answers?: RsvpAnswers;
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
  /** The event's sign-up sheet, as this guest sees it. Guests pick rows here. */
  signup?: { title: string; rows: GuestSignupRow[] } | null;
  /** A meal train: guests say whether they can help and pick days, with no party size. */
  mealTrain?: boolean;
  /** What the host asks besides how many are coming (src/lib/rsvp-questions.ts). */
  questions?: RsvpQuestion[];
  submitAction?: (input: RsvpInput) => Promise<{ error: string | null; token?: string }>;
}

function rowName(row: Pick<GuestSignupRow, "label" | "slotDate">) {
  return row.slotDate ? `${formatSlotDate(row.slotDate)}: ${row.label}` : row.label;
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
  signup = null,
  mealTrain = false,
  questions = [],
  submitAction = submitRsvp,
}: RsvpFormProps) {
  const router = useRouter();
  const exchangeOnly = Boolean(exchange?.mailed);
  // No party to come to: no party size, and answers that fit.
  const noParty = exchangeOnly || mealTrain;
  const rows = signup?.rows ?? [];
  // The rows this guest has, with what they're bringing.
  const minePicks = () => new Map(rows.filter((r) => r.mine).map((r) => [r.id, r.mine?.note ?? ""]));
  const [picks, setPicks] = useState<Map<string, string>>(minePicks);
  // The answer just sent, shown until the refreshed page brings it back.
  const [saved, setSaved] = useState<{
    status: Answer;
    partySize: number;
    kidsCount: number;
    note: string | null;
    inExchange: boolean;
    picks: Map<string, string>;
    answers: RsvpAnswers;
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
          picks: minePicks(),
          answers: guest.answers ?? {},
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
  // Answers to the host's questions.
  const [replies, setReplies] = useState<RsvpAnswers>(guest?.answers ?? {});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const answers = exchangeOnly ? EXCHANGE_ANSWERS : mealTrain ? MEAL_TRAIN_ANSWERS : PARTY_ANSWERS;
  const question = exchangeOnly ? "are you in?" : mealTrain ? "can you help?" : "can you make it?";
  const heading = guest ? `Hi ${guest.name}, ${question}` : question[0].toUpperCase() + question.slice(1);

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
    const signedUp = rows
      .filter((row) => current.picks.has(row.id))
      .map((row) => describeClaim({ label: row.label, slotDate: row.slotDate, note: current.picks.get(row.id) || null }));
    return (
      <section aria-labelledby="rsvp-heading" className="rounded-2xl border border-secondary p-5">
        <h2 id="rsvp-heading" className="font-display text-xl font-semibold">
          {exchangeOnly
            ? current.status === "yes"
              ? "You're in the gift exchange"
              : "You're sitting this one out"
            : mealTrain
              ? current.status === "yes"
                ? "You're signed up to help"
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
        {current.status !== "no" && answerLines(questions, current.answers, "You").length > 0 && (
          <dl className="mt-3 flex flex-col gap-1 text-sm">
            {answerLines(questions, current.answers, "You").map((line) => (
              <div key={line.label}>
                <dt className="inline font-medium text-primary">{answerLabel(line.label)} </dt>
                <dd className="inline text-secondary">{line.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {signedUp.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-primary">You signed up for</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-secondary">
              {signedUp.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {current.note && <p className="mt-3 text-sm whitespace-pre-line text-secondary">Your note: {current.note}</p>}
        {!passed && (
          <Button variant="outline" className="mt-4" onClick={() => setEditing(true)}>
            {exchange && current.inExchange
              ? "Change your answer or wishlist"
              : signup && current.status !== "no"
                ? "Change RSVP or sign-ups"
                : "Change RSVP"}
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
  const showPartySize = !noParty && maxPartySize > 1 && attending;
  const showKids = askKids && attending && !noParty;
  const showSignup = Boolean(signup) && attending;
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
      setError(
        exchangeOnly
          ? "Choose I'm in or Not this year."
          : mealTrain
            ? "Choose I can help or Not this time."
            : "Choose Going, Maybe or Can't go.",
      );
      return;
    }
    if (exchange?.mailed && inExchange && !address.trim()) {
      setError("Add a shipping address, so your Secret Santa can mail your gift.");
      return;
    }
    if (mealTrain && answer === "yes" && picks.size === 0) {
      setError("Pick at least one day you can help.");
      return;
    }
    const size = showPartySize ? Number(partySize) : 1;
    // The same check the server makes, so a missing answer shows at once.
    const checked = attending && questions.length > 0 ? readAnswers(questions, replies, size) : { answers: {} };
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    setSending(true);
    setError("");
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
      signups: signup
        ? answer === "no"
          ? []
          : [...picks].map(([itemId, itemNote]) => ({ itemId, note: itemNote }))
        : undefined,
      answers: checked.answers,
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
      picks: answer === "no" ? new Map() : new Map(picks),
      answers: checked.answers,
    });
    if (answer === "no") setPicks(new Map());
    setSending(false);
    setEditing(false);
  };

  const togglePick = (id: string, on: boolean) => {
    setError("");
    setPicks((current) => {
      const next = new Map(current);
      if (on) next.set(id, current.get(id) ?? "");
      else next.delete(id);
      return next;
    });
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

        {attending && questions.length > 0 && (
          <QuestionFields
            questions={questions}
            answers={replies}
            onChange={(id, value) => {
              setError("");
              setReplies((current) => ({ ...current, [id]: value }));
            }}
            partySize={showPartySize ? Number(partySize) : 1}
          />
        )}

        {showSignup && signup && (
          <fieldset className="flex flex-col gap-3 rounded-xl bg-sunshine-50 p-4">
            <legend className="sr-only">{signup.title}</legend>
            <div>
              <p className="font-medium text-primary">{mealTrain ? "Pick a day" : "I'll bring…"}</p>
              <p className="text-sm text-tertiary">
                {mealTrain
                  ? "Choose one or more. You'll see the drop-off address once you send."
                  : "Optional. Choose anything you'd like to bring or help with."}
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-tertiary">The host hasn&apos;t added anything to sign up for yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {rows.map((row) => {
                  const picked = picks.has(row.id);
                  const open = rowIsOpen(row);
                  const status = row.passed && !row.mine ? "Over" : row.mine ? "Yours" : spotsLabel(row);
                  return (
                    <li key={row.id} className="flex flex-col gap-2">
                      <Checkbox
                        isSelected={picked}
                        isDisabled={!picked && !open}
                        onChange={(on) => togglePick(row.id, on)}
                        label={<span className="font-medium text-primary">{rowName(row)}</span>}
                        hint={[status, row.bringing.length > 0 ? `Bringing: ${row.bringing.join(", ")}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                      {picked && (
                        <div className="pl-6">
                          <Input
                            aria-label={`What you're ${mealTrain ? "making" : "bringing"} for ${rowName(row)}`}
                            value={picks.get(row.id) ?? ""}
                            onChange={(value) => setPicks((current) => new Map(current).set(row.id, value))}
                            maxLength={MAX_CLAIM_NOTE_LENGTH}
                            placeholder={mealTrain ? "What you're making (optional)" : "What you're bringing (optional)"}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
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
          placeholder={answer === "no" ? "Sorry to miss it!" : mealTrain ? "Happy to help!" : "Can't wait!"}
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
              {sending ? "Sending…" : noParty ? "Send" : "Send RSVP"}
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

/**
 * The host's RSVP questions. A meal question asks once for each person coming,
 * and a plus-ones question asks for the name of each person but the guest.
 */
function QuestionFields({
  questions,
  answers,
  onChange,
  partySize,
}: {
  questions: RsvpQuestion[];
  answers: RsvpAnswers;
  onChange: (id: string, value: string | string[]) => void;
  partySize: number;
}) {
  const label = (question: RsvpQuestion) => (question.required ? question.label : `${question.label} (optional)`);
  const plusOnes = questions.find((q) => q.kind === "plus_ones");
  const names = plusOnes && Array.isArray(answers[plusOnes.id]) ? (answers[plusOnes.id] as string[]) : [];
  const listOf = (id: string, length: number) => {
    const value = answers[id];
    return Array.from({ length }, (_, i) => (Array.isArray(value) ? (value[i] ?? "") : ""));
  };
  const setAt = (id: string, length: number, index: number, value: string) => {
    const next = listOf(id, length);
    next[index] = value;
    onChange(id, next);
  };

  // Names first, so each meal can say who it's for.
  const ordered = [...questions].sort((a, b) => Number(b.kind === "plus_ones") - Number(a.kind === "plus_ones"));

  return (
    <div className="flex flex-col gap-4">
      {ordered.map((question) => {
        if (question.kind === "plus_ones") {
          const count = plusOneCount(partySize);
          if (count === 0) return null;
          return (
            <fieldset key={question.id} className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium text-secondary">{label(question)}</legend>
              {listOf(question.id, count).map((name, i) => (
                <Input
                  key={i}
                  aria-label={`Name of guest ${i + 2}`}
                  placeholder={`Guest ${i + 2}'s name`}
                  value={name}
                  onChange={(value) => setAt(question.id, count, i, value)}
                  maxLength={100}
                />
              ))}
            </fieldset>
          );
        }
        if (question.kind === "meal") {
          const people = Math.max(partySize, 1);
          return (
            <fieldset key={question.id} className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium text-secondary">{label(question)}</legend>
              <div className={cx("grid gap-2", people > 1 && "sm:grid-cols-2")}>
                {listOf(question.id, people).map((pick, i) => (
                  <NativeSelect
                    key={i}
                    // Alone, the group's legend says what it is. With others, each says who it's for.
                    aria-label={question.label}
                    label={people > 1 ? `For ${i === 0 ? "you" : names[i - 1]?.trim() || `guest ${i + 1}`}` : undefined}
                    value={pick}
                    onChange={(e) => setAt(question.id, people, i, e.target.value)}
                    options={[
                      { value: "", label: "Choose…" },
                      ...question.options.map((option) => ({ value: option, label: option })),
                    ]}
                  />
                ))}
              </div>
            </fieldset>
          );
        }
        const value = typeof answers[question.id] === "string" ? (answers[question.id] as string) : "";
        return question.kind === "diet" ? (
          <TextArea
            key={question.id}
            label={label(question)}
            value={value}
            onChange={(next) => onChange(question.id, next)}
            rows={2}
            maxLength={500}
            placeholder="Vegetarian, no nuts"
          />
        ) : (
          <Input
            key={question.id}
            label={label(question)}
            value={value}
            onChange={(next) => onChange(question.id, next)}
            maxLength={500}
          />
        );
      })}
    </div>
  );
}
