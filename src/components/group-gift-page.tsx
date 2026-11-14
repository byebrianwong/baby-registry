"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, DollarSign, ExternalLink, Gift, Users } from "lucide-react";
import { Mail01 } from "@untitledui/icons";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ItemImage } from "@/components/item-image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  callOffGroupGift,
  changePledge,
  markGroupGiftBought,
  pledgeToGroupGift,
  setPledgePaid,
  withdrawPledge,
} from "@/lib/actions/group-gifts";
import {
  groupGiftProgress,
  parseGroupGiftAmount,
  type GroupGiftPledgeView,
  type GroupGiftView,
  type GroupGiftViewer,
} from "@/lib/group-gifts";
import { formatAmount as money, formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

// The page others chip in from (/group-gift/<token>). Everyone sees the item,
// the total so far and who's in. The organizer also sees what each person
// pledged, ticks them off as they pay, and marks the gift bought or calls it
// off. Changes show straight away, then the page refreshes from the server.

export interface GroupGiftPageActions {
  pledge: typeof pledgeToGroupGift;
  change: typeof changePledge;
  withdraw: typeof withdrawPledge;
  setPaid: typeof setPledgePaid;
  markBought: typeof markGroupGiftBought;
  callOff: typeof callOffGroupGift;
}

const SERVER_ACTIONS: GroupGiftPageActions = {
  pledge: pledgeToGroupGift,
  change: changePledge,
  withdraw: withdrawPledge,
  setPaid: setPledgePaid,
  markBought: markGroupGiftBought,
  callOff: callOffGroupGift,
};

export interface GroupGiftPageProps {
  view: GroupGiftView;
  viewer: GroupGiftViewer;
  /** The link the organizer shares. */
  shareUrl: string;
  /** Stories and the demo pass their own. */
  actions?: Partial<GroupGiftPageActions>;
  /** Where the list and event pages live. The demo passes "/demo". */
  basePath?: string;
}

const FALLBACK_ERROR = "Something went wrong. Try again in a moment.";

async function attempt<T extends { error?: string }>(run: () => Promise<T>): Promise<{ error: string } | T> {
  try {
    const result = await run();
    return result.error ? { error: result.error } : result;
  } catch {
    return { error: FALLBACK_ERROR };
  }
}

const linkClass =
  "inline-flex items-center gap-1 rounded-sm font-medium text-brand-secondary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-25 p-4">
      <div>
        <h2 className="font-semibold text-primary">Share this link with friends</h2>
        <p className="text-sm text-secondary">
          Anyone with it can chip in, no account needed, so only send it to people you trust.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 truncate rounded-lg bg-primary px-3 py-2 font-mono text-sm text-secondary ring-1 ring-secondary">
          {url}
        </p>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </span>
        </Button>
      </div>
      <p className="sr-only" role="status">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}

function PaidBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-secondary px-2 py-0.5 text-xs font-medium text-primary">
      <Check aria-hidden="true" className="size-3 text-fg-success-primary" />
      Paid
    </span>
  );
}

export function GroupGiftPage({
  view: serverView,
  viewer: serverViewer,
  shareUrl,
  actions,
  basePath = "",
}: GroupGiftPageProps) {
  const router = useRouter();
  const act = { ...SERVER_ACTIONS, ...actions };

  // Shows changes straight away; starts over when the server sends new data.
  const serverKey = JSON.stringify([serverView, serverViewer]);
  const [syncedKey, setSyncedKey] = useState(serverKey);
  const [view, setView] = useState(serverView);
  const [viewer, setViewer] = useState(serverViewer);
  if (serverKey !== syncedKey) {
    setSyncedKey(serverKey);
    setView(serverView);
    setViewer(serverViewer);
  }

  const [name, setName] = useState(serverViewer.prefill?.name ?? "");
  const [email, setEmail] = useState(serverViewer.prefill?.email ?? "");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState<"bought" | "calloff" | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [savingPaid, setSavingPaid] = useState<string[]>([]);
  // Each error shows next to what caused it.
  const [error, setErrorState] = useState<{ at: "chip" | "list" | "finish"; message: string } | null>(null);
  const setError = (message: string, at: "chip" | "list" | "finish" = "chip") =>
    setErrorState(message ? { at, message } : null);
  const errorAt = (at: "chip" | "list" | "finish") =>
    error?.at === at ? (
      <p role="alert" className="text-sm text-error-primary">
        {error.message}
      </p>
    ) : null;
  const [notice, setNotice] = useState("");

  const progressId = useId();
  const isOrganizer = viewer.role === "organizer";
  const mine = viewer.myPledge;
  const goal = view.goalAmount;
  const { percent, toGo } = groupGiftProgress(view.pledged, goal);
  const open = view.status !== "ended";
  const busy = pending !== null;

  function changeTotal(delta: number) {
    return Math.round((view.pledged + delta) * 100) / 100;
  }

  async function chipIn() {
    const value = parseGroupGiftAmount(amount);
    if (value === null) {
      setError("Enter an amount, like 20.");
      return;
    }
    setPending("pledge");
    setError("");
    setNotice("");
    const result = await attempt(() =>
      act.pledge({ token: view.token, amount: value, name: name.trim(), email: email.trim() }),
    );
    setPending(null);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    const pledgeToken = "pledgeToken" in result ? result.pledgeToken : "";
    // Signed in, the server uses the account's name, or the one typed in when the account has none.
    const shownName = viewer.signedIn ? viewer.prefill?.name || name.trim() || "You" : name.trim();
    setView((v) => ({
      ...v,
      pledged: changeTotal(value),
      pledges: [...v.pledges, { id: null, name: shownName, amount: value, email: null, paid: false, isMine: true }],
    }));
    setViewer((v) => ({
      ...v,
      role: v.role === "organizer" ? "organizer" : "pledger",
      myPledge: { token: pledgeToken, name: shownName, amount: value, paid: false },
    }));
    setAmount("");
    setNotice(
      viewer.signedIn || isOrganizer
        ? `You're in for ${money(value)}.`
        : `You're in for ${money(value)}. We emailed you a link to change it later.`,
    );
    router.refresh();
  }

  async function saveChange() {
    if (!mine) return;
    const value = parseGroupGiftAmount(amount);
    if (value === null) {
      setError("Enter an amount, like 20.");
      return;
    }
    setPending("change");
    setError("");
    const result = await attempt(() => act.change(view.token, mine.token, value));
    setPending(null);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setView((v) => ({
      ...v,
      pledged: changeTotal(value - mine.amount),
      pledges: v.pledges.map((p) => (p.isMine ? { ...p, amount: value } : p)),
    }));
    setViewer((v) => ({ ...v, myPledge: mine ? { ...mine, amount: value } : null }));
    setEditing(false);
    setAmount("");
    setNotice(`Changed to ${money(value)}.`);
    router.refresh();
  }

  async function takeBack() {
    if (!mine) return;
    setPending("withdraw");
    setError("");
    const result = await attempt(() => act.withdraw(view.token, mine.token));
    setPending(null);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setView((v) => ({ ...v, pledged: changeTotal(-mine.amount), pledges: v.pledges.filter((p) => !p.isMine) }));
    setViewer((v) => ({ ...v, role: v.role === "organizer" ? "organizer" : "visitor", myPledge: null }));
    setEditing(false);
    setNotice("You took back your pledge.");
    router.refresh();
  }

  async function togglePaid(person: GroupGiftPledgeView, paid: boolean) {
    if (!person.id) return;
    const id = person.id;
    const flip = (value: boolean) => (v: GroupGiftView) => ({
      ...v,
      pledges: v.pledges.map((p) => (p.id === id ? { ...p, paid: value } : p)),
    });
    setSavingPaid((ids) => [...ids, id]);
    setError("");
    setView(flip(paid));
    const result = await attempt(() => act.setPaid(view.token, id, paid));
    setSavingPaid((ids) => ids.filter((x) => x !== id));
    if ("error" in result && result.error) {
      setView(flip(!paid));
      setError(result.error, "list");
      return;
    }
    router.refresh();
  }

  async function finish(kind: "bought" | "calloff") {
    setPending(kind);
    setError("");
    const result = await attempt(() => (kind === "bought" ? act.markBought(view.token) : act.callOff(view.token)));
    setPending(null);
    setConfirming(null);
    if ("error" in result && result.error) {
      setError(result.error, "finish");
      return;
    }
    setView((v) => ({ ...v, status: kind === "bought" ? "bought" : "ended" }));
    setNotice(
      kind === "bought"
        ? `Marked bought. ${view.recipientName} will hear it's from you and others.`
        : `Called off. The ${view.item.title} is open again on ${view.recipientName}'s list.`,
    );
    router.refresh();
  }

  const statusBanner =
    view.status === "bought" ? (
      <div className="flex items-start gap-3 rounded-2xl border border-mint-500 bg-mint-50 p-4">
        <Gift aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-mint-800" />
        <div className="min-w-0">
          <p className="font-semibold text-primary">
            {isOrganizer ? "You bought it" : `${view.organizerName} bought it`}
          </p>
          <p className="text-sm text-secondary">
            {isOrganizer
              ? "Keep ticking people off as they pay you back."
              : mine && !mine.paid
                ? `If you haven't paid ${view.organizerName} back yet, now's the time.`
                : `Thanks for going in on it together.`}
          </p>
        </div>
      </div>
    ) : view.status === "ended" ? (
      <div className="rounded-2xl border border-secondary bg-secondary p-4">
        <p className="font-semibold text-primary">This group gift was called off</p>
        <p className="text-sm text-secondary">
          {isOrganizer
            ? view.pledges.some((p) => p.paid)
              ? "Send the money back to anyone marked paid below."
              : `The ${view.item.title} is open again on ${view.recipientName}'s list.`
            : mine?.paid
              ? `${view.organizerName} had marked your share as paid. Ask them to send it back.`
              : "Nobody needs to chip in."}
        </p>
      </div>
    ) : !view.item.onList ? (
      <div className="rounded-2xl border border-warning-300 bg-warning-primary p-4 text-sm text-primary">
        This item was taken off {view.recipientName}&apos;s list.
        {isOrganizer ? " You can call off the group gift below." : ` Check with ${view.organizerName} before you pay.`}
      </div>
    ) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* The gift */}
      <section className="flex gap-4" aria-labelledby="group-gift-title">
        <ItemImage imageUrl={view.item.imageUrl} title={view.item.title} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold tracking-wide text-brand-secondary uppercase">
            A group gift for {view.recipientName}
          </p>
          <h1 id="group-gift-title" className="font-display text-2xl font-bold break-words text-primary">
            {view.item.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
            {view.item.price != null && <span className="font-semibold text-primary">{formatPrice(view.item.price)}</span>}
            {view.item.url && (
              <a href={view.item.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                See it
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            )}
            <Link href={`${basePath}/r/${view.listSlug}`} className={linkClass}>
              {view.recipientName}&apos;s list
            </Link>
          </p>
          <p className="text-sm text-tertiary">
            Started by {isOrganizer ? "you" : view.organizerName}
            {view.event && (
              <>
                {" "}
                for{" "}
                <Link href={`${basePath}/e/${view.event.slug}`} className={linkClass}>
                  {view.event.title}
                </Link>
              </>
            )}
          </p>
        </div>
      </section>

      {statusBanner}

      {isOrganizer && view.status === "open" && <ShareLink url={shareUrl} />}

      {/* Progress */}
      <section aria-label="How much is pledged" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p id={progressId} className="text-lg text-secondary">
            <span className="font-semibold text-primary">{money(view.pledged)}</span>
            {goal ? <> of {money(goal)}</> : " pledged so far"}
          </p>
          {goal && open && (
            <p className="text-sm text-tertiary">
              {toGo > 0 ? (
                `${money(toGo)} to go`
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Check aria-hidden="true" className="size-4 text-fg-success-primary" />
                  That covers it
                </span>
              )}
            </p>
          )}
        </div>
        {goal ? <Progress aria-labelledby={progressId} value={percent} /> : null}
      </section>

      {view.paybackNote && open && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm break-words text-secondary">
          {isOrganizer ? "How people pay you back: " : `Pay ${view.organizerName} back: `}
          <span className="font-medium text-primary">{view.paybackNote}</span>
        </p>
      )}
      {!view.paybackNote && open && !isOrganizer && (
        <p className="text-sm text-tertiary">Ask {view.organizerName} how to send your share.</p>
      )}

      <p role="status" className={notice ? "text-sm font-medium text-success-primary" : "sr-only"}>
        {notice}
      </p>

      {/* The viewer's own pledge, or the form to chip in */}
      {open && (
        <section aria-labelledby="chip-in-heading" className="flex flex-col gap-3 rounded-2xl border border-secondary p-4">
          <h2 id="chip-in-heading" className="font-semibold text-primary">
            {mine ? "Your share" : "Chip in"}
          </h2>
          {mine && !editing ? (
            <div className="flex flex-col gap-3">
              <p className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                You&apos;re chipping in <span className="font-semibold text-primary">{money(mine.amount)}</span>
                {mine.paid && <PaidBadge />}
              </p>
              {mine.paid ? (
                !isOrganizer && (
                  <p className="text-sm text-tertiary">{view.organizerName} marked it paid. Thank you!</p>
                )
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setNotice("");
                      setAmount(String(mine.amount));
                      setEditing(true);
                    }}
                  >
                    Change amount
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => void takeBack()}>
                    {pending === "withdraw" ? "Taking it back..." : "Take it back"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void (editing ? saveChange() : chipIn());
              }}
            >
              {/* Signed in, the name and email come from the account. */}
              {!editing && viewer.signedIn && viewer.prefill?.name && (
                <p className="text-sm text-tertiary">Chipping in as {viewer.prefill.name}.</p>
              )}
              {!editing && (!viewer.signedIn || !viewer.prefill?.name) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Your name"
                    placeholder="Alex Kim"
                    autoComplete="name"
                    value={name}
                    onChange={setName}
                    isRequired
                  />
                  {!viewer.signedIn && (
                    <Input
                      label="Your email"
                      type="email"
                      placeholder="alex@example.com"
                      autoComplete="email"
                      icon={Mail01}
                      value={email}
                      onChange={setEmail}
                      isRequired
                      hint="We'll send you a link to change it."
                    />
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  label={editing ? "Your new amount" : "Your share"}
                  icon={DollarSign}
                  inputMode="decimal"
                  placeholder="20"
                  value={amount}
                  onChange={setAmount}
                  autoFocus={editing}
                  isInvalid={error?.at === "chip" && parseGroupGiftAmount(amount) === null}
                  className="w-40"
                />
                <Button type="submit" disabled={busy}>
                  {pending === "pledge" || pending === "change" ? "Saving..." : editing ? "Save" : "Chip in"}
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              {!editing && (
                <p className="text-sm text-tertiary">
                  {view.recipientName} never sees who chipped in or how much.
                </p>
              )}
            </form>
          )}
          {errorAt("chip")}
        </section>
      )}

      {/* Who's in */}
      <section aria-labelledby="whos-in-heading" className="flex flex-col gap-2">
        <h2 id="whos-in-heading" className="flex items-center gap-2 font-semibold text-primary">
          <Users aria-hidden="true" className="size-4" />
          Who&apos;s in
        </h2>
        {isOrganizer && view.pledges.length > 0 && (
          <p className="text-sm text-tertiary">
            {view.status === "ended" ? "Who you'd marked paid." : "Tick people off as they pay you back."}
          </p>
        )}
        {view.pledges.length === 0 ? (
          <p className="text-sm text-tertiary">Nobody has chipped in yet.</p>
        ) : (
          <ul className="divide-y divide-secondary rounded-xl border border-secondary">
            {view.pledges.map((person, index) => (
              <li key={person.id ?? `${person.name}-${index}`} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-primary">{person.isMine ? `${person.name} (you)` : person.name}</span>
                  {person.email && <span className="block truncate text-xs text-tertiary">{person.email}</span>}
                </span>
                {person.amount != null && (
                  <span className="font-medium text-primary tabular-nums">{money(person.amount)}</span>
                )}
                {/* The organizer ticks off everyone else. Their own share is the part they pay. */}
                {isOrganizer && person.id && !person.isMine ? (
                  <Checkbox
                    label="Paid"
                    aria-label={`${person.name} paid`}
                    isSelected={person.paid}
                    isDisabled={view.status === "ended"}
                    isReadOnly={savingPaid.includes(person.id)}
                    onChange={(paid) => void togglePaid(person, paid)}
                    className="shrink-0"
                  />
                ) : (
                  !(isOrganizer && person.isMine) && (isOrganizer || person.isMine) && person.paid && <PaidBadge />
                )}
              </li>
            ))}
          </ul>
        )}
        {errorAt("list")}
      </section>

      {/* The organizer finishes it */}
      {isOrganizer && view.status === "open" && (
        <section aria-labelledby="finish-heading" className="flex flex-col gap-3 border-t border-secondary pt-6">
          <h2 id="finish-heading" className="font-semibold text-primary">
            When you&apos;re ready
          </h2>
          {confirming ? (
            <div
              role="group"
              aria-labelledby="finish-confirm"
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4",
                confirming === "calloff" ? "border-warning-300 bg-warning-primary" : "border-secondary bg-secondary",
              )}
            >
              <p id="finish-confirm" className="text-sm text-primary">
                {confirming === "bought"
                  ? `Mark the ${view.item.title} as bought? ${view.recipientName} hears it's from you and others, the same way they hear about any gift.`
                  : `Call off this group gift? The ${view.item.title} opens up again on ${view.recipientName}'s list, and everyone who chipped in gets an email.${
                      view.pledges.some((p) => p.paid) ? " Send back any money you've been paid." : ""
                    }`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={confirming === "calloff" ? "destructive" : "default"}
                  disabled={busy}
                  onClick={() => void finish(confirming)}
                >
                  {pending === confirming
                    ? confirming === "bought"
                      ? "Saving..."
                      : "Calling it off..."
                    : confirming === "bought"
                      ? "Yes, I bought it"
                      : "Call it off"}
                </Button>
                <Button variant="outline" disabled={busy} autoFocus onClick={() => setConfirming(null)}>
                  {confirming === "bought" ? "Not yet" : "Keep it going"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {view.item.onList && (
                <Button
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setConfirming("bought");
                  }}
                >
                  I bought it
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setConfirming("calloff");
                }}
              >
                Call it off
              </Button>
            </div>
          )}
          {errorAt("finish")}
          {view.item.onList && (
            <p className="text-sm text-tertiary">
              It stays reserved in your name until then, so nobody else buys it.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
