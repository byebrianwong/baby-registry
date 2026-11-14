"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Shuffle, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/base/select/select-native";
import {
  addExchangeExclusion,
  drawExchangeNames,
  removeExchangeExclusion,
  setExchangeParticipant,
  undoExchangeDraw,
} from "@/lib/actions/events";
import {
  exchangeKind,
  formatEventDate,
  MIN_EXCHANGE_PARTICIPANTS,
  type EventGuest,
  type ExchangeStatus,
  type GiftExchange,
} from "@/lib/events";

type ActionResult = { error: string | null };

export interface ExchangeActions {
  setParticipant: (eventId: string, guestId: string, inExchange: boolean) => Promise<ActionResult>;
  addExclusion: (eventId: string, guestA: string, guestB: string) => Promise<ActionResult>;
  removeExclusion: (eventId: string, guestA: string, guestB: string) => Promise<ActionResult>;
  draw: (eventId: string, options?: { again?: boolean }) => Promise<ActionResult & { emailed?: number; withoutEmail?: number }>;
  undo: (eventId: string) => Promise<ActionResult>;
}

const DEFAULT_ACTIONS: ExchangeActions = {
  setParticipant: setExchangeParticipant,
  addExclusion: addExchangeExclusion,
  removeExclusion: removeExchangeExclusion,
  draw: drawExchangeNames,
  undo: undoExchangeDraw,
};

export interface ExchangeManagerProps {
  eventId: string;
  exchange: Pick<GiftExchange, "kind" | "budget" | "draw_by" | "mailed" | "drawn_at">;
  status: ExchangeStatus;
  /**
   * The guest list, as hosts see it: with no pairs, wishlists or addresses.
   * wishlist_url is "added" when the guest added one.
   */
  guests: (Pick<EventGuest, "id" | "name" | "rsvp_status" | "in_exchange"> & Partial<Pick<EventGuest, "wishlist_url">>)[];
  exclusions: { guest_a: string; guest_b: string }[];
  /** Where Edit goes. The demo passes its own. */
  editHref: string;
  actions?: Partial<ExchangeActions>;
}

/** The host's side of a gift exchange: a name draw, or everyone giving everyone. */
export function ExchangeManager({
  eventId,
  exchange,
  status,
  guests,
  exclusions,
  editHref,
  actions: overrides,
}: ExchangeManagerProps) {
  if (exchangeKind(exchange) === "everyone") {
    return <EveryoneGivesManager exchange={exchange} guests={guests} editHref={editHref} />;
  }
  return (
    <DrawManager
      eventId={eventId}
      exchange={exchange}
      status={status}
      guests={guests}
      exclusions={exclusions}
      editHref={editHref}
      actions={overrides}
    />
  );
}

/**
 * The host's side of an everyone-gives-everyone event: who's taking part and
 * who has added a wish list. There's nothing to draw. The host sees whether a
 * guest added a list, not the list itself, unless they're a guest too.
 */
function EveryoneGivesManager({
  exchange,
  guests,
  editHref,
}: Pick<ExchangeManagerProps, "exchange" | "guests" | "editHref">) {
  const taking = guests.filter((g) => g.in_exchange);
  const withList = taking.filter((g) => g.wishlist_url);
  const waiting = guests.filter((g) => g.rsvp_status === "pending").length;
  return (
    <section aria-labelledby="exchange-manager-heading" className="flex flex-col gap-4 rounded-2xl bg-mint-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
            <Users aria-hidden="true" className="size-4.5 text-mint-800" />
          </span>
          <div>
            <h2 id="exchange-manager-heading" className="text-lg font-semibold text-primary">
              Everyone gives everyone
            </h2>
            <p className="text-sm text-tertiary">
              {exchange.budget ? `About ${exchange.budget} a gift · ` : ""}Guests link wish lists when they RSVP
            </p>
          </div>
        </div>
        <Link href={editHref} className="text-sm font-medium text-brand-600 hover:underline max-sm:min-h-11">
          Change settings
        </Link>
      </div>

      <p className="text-primary">
        {taking.length === 0
          ? "Nobody is taking part yet. Guests who say they're going or might go take part."
          : `${taking.length === 1 ? "1 guest is" : `${taking.length} guests are`} taking part, and ${
              withList.length === taking.length
                ? "everyone has"
                : withList.length === 1
                  ? "1 has"
                  : `${withList.length} have`
            } added a wish list.`}
        {waiting > 0 ? ` ${waiting === 1 ? "1 guest hasn't" : `${waiting} guests haven't`} answered yet.` : ""}
      </p>

      {taking.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {taking.map((g) => (
            <li
              key={g.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-sm text-primary"
            >
              {g.wishlist_url ? (
                <Check aria-hidden="true" className="size-3.5 text-success-primary" />
              ) : (
                <span aria-hidden="true" className="size-2 rounded-full bg-quaternary" />
              )}
              {g.name}
              <span className="sr-only">{g.wishlist_url ? ", has a wish list" : ", no wish list yet"}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-tertiary">
        Guests see everyone&apos;s lists on the invitation, and what the others reserved from each one. Nobody sees
        what&apos;s been reserved from their own list until the day after the event. Taking part yourself? Add
        yourself to the guest list and RSVP from your own link.
      </p>
    </section>
  );
}

/**
 * The host's side of a name draw: who's in, who shouldn't draw whom, and the
 * draw. The host never sees who drew whom; each person gets an email and sees
 * their own on their RSVP link.
 */
function DrawManager({
  eventId,
  exchange,
  status,
  guests,
  exclusions,
  editHref,
  actions: overrides,
}: ExchangeManagerProps) {
  const router = useRouter();
  const actions = { ...DEFAULT_ACTIONS, ...overrides };
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<"draw" | "again" | "undo" | null>(null);
  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");
  const [error, setError] = useState("");

  const drawn = Boolean(exchange.drawn_at);
  const participants = guests.filter((g) => g.in_exchange);
  const others = guests.filter((g) => !g.in_exchange && g.rsvp_status !== "no");
  const nameOf = new Map(guests.map((g) => [g.id, g.name]));
  const enough = participants.length >= MIN_EXCHANGE_PARTICIPANTS;

  const run = async (work: () => Promise<ActionResult>, success?: string) => {
    setBusy(true);
    setError("");
    const result = await work();
    setBusy(false);
    setConfirming(null);
    if (result.error) {
      setError(result.error);
      return false;
    }
    if (success) toast.success(success);
    router.refresh();
    return true;
  };

  const draw = async (again: boolean) => {
    setBusy(true);
    setError("");
    const result = await actions.draw(eventId, { again });
    setBusy(false);
    setConfirming(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    const emailed = result.emailed ?? 0;
    toast.success(`Names drawn. ${emailed === 1 ? "1 person was" : `${emailed} people were`} emailed their person.`);
    router.refresh();
  };

  const summary = [
    exchange.budget ? `Budget ${exchange.budget}` : null,
    exchange.draw_by && !drawn ? `Draw by ${formatEventDate(exchange.draw_by)}` : null,
    exchange.mailed ? "Gifts are mailed" : "Gifts come to the party",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="exchange-manager-heading" className="flex flex-col gap-4 rounded-2xl bg-mint-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
            <Shuffle aria-hidden="true" className="size-4.5 text-mint-800" />
          </span>
          <div>
            <h2 id="exchange-manager-heading" className="text-lg font-semibold text-primary">
              Gift exchange
            </h2>
            <p className="text-sm text-tertiary">{summary}</p>
          </div>
        </div>
        <Link href={editHref} className="text-sm font-medium text-brand-600 hover:underline max-sm:min-h-11">
          Change settings
        </Link>
      </div>

      {drawn ? (
        <div className="flex flex-col gap-2">
          <p className="text-primary">
            Names were drawn on {new Date(exchange.drawn_at!).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.{" "}
            Everyone with an email got their person. Nobody else can see who drew whom, you included.
          </p>
          {status.withoutEmail > 0 && (
            <p className="text-sm text-secondary">
              {status.withoutEmail === 1 ? "1 person has" : `${status.withoutEmail} people have`} no email. Copy their RSVP
              link from the guest list and text it to them: it shows their person.
            </p>
          )}
          {status.stale && (
            <p className="flex items-start gap-2 rounded-xl bg-sunshine-50 p-3 text-sm text-sunshine-900">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Someone joined or left after the draw, so not everyone has exactly one person. Draw again to fix it.
            </p>
          )}
        </div>
      ) : (
        <p className="text-primary">
          {participants.length === 0
            ? "Nobody has joined yet. Guests join when they RSVP."
            : `${participants.length === 1 ? "1 person is" : `${participants.length} people are`} in, and ${
                status.withWishlist === 1 ? "1 has" : `${status.withWishlist} have`
              } added a wishlist or gift ideas.`}
          {exchange.mailed && status.withoutAddress > 0
            ? ` ${status.withoutAddress === 1 ? "1 still needs" : `${status.withoutAddress} still need`} to add a shipping address.`
            : ""}
        </p>
      )}

      {/* Who's in */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-secondary">Who&apos;s in</h3>
        {participants.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {participants.map((g) => (
              <li key={g.id} className="inline-flex items-center gap-1 rounded-full bg-primary py-1 pr-1 pl-3 text-sm text-primary">
                {g.name}
                {!drawn && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Take ${g.name} out of the exchange`}
                    onClick={() => run(() => actions.setParticipant(eventId, g.id, false))}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full text-tertiary hover:bg-secondary hover:text-primary max-sm:size-9"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!drawn && others.length > 0 && (
          <NativeSelect
            aria-label="Add someone from the guest list"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && run(() => actions.setParticipant(eventId, e.target.value, true))}
            options={[
              { value: "", label: "Add someone from the guest list…" },
              ...others.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
        )}
        {!drawn && (
          <p className="text-xs text-tertiary">
            Taking part yourself? Add yourself to the guest list with your email and RSVP from your own link, so you
            get your person like everyone else.
          </p>
        )}
      </div>

      {/* Exclusions */}
      {(!drawn || exclusions.length > 0) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-secondary">Who won&apos;t draw each other</h3>
          {exclusions.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {exclusions.map((x) => (
                <li
                  key={`${x.guest_a}-${x.guest_b}`}
                  className="inline-flex items-center gap-1 rounded-full bg-primary py-1 pr-1 pl-3 text-sm text-primary"
                >
                  {nameOf.get(x.guest_a) ?? "Someone"} &amp; {nameOf.get(x.guest_b) ?? "someone"}
                  {!drawn && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Let ${nameOf.get(x.guest_a)} and ${nameOf.get(x.guest_b)} draw each other`}
                      onClick={() => run(() => actions.removeExclusion(eventId, x.guest_a, x.guest_b))}
                      className="flex size-6 cursor-pointer items-center justify-center rounded-full text-tertiary hover:bg-secondary hover:text-primary max-sm:size-9"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tertiary">Partners usually don&apos;t draw each other. Add them here.</p>
          )}
          {!drawn && participants.length >= 2 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <NativeSelect
                  aria-label="First person"
                  value={pairA}
                  onChange={(e) => setPairA(e.target.value)}
                  options={[{ value: "", label: "Choose someone…" }, ...participants.map((g) => ({ value: g.id, label: g.name }))]}
                />
              </div>
              <div className="min-w-0 flex-1">
                <NativeSelect
                  aria-label="Second person"
                  value={pairB}
                  onChange={(e) => setPairB(e.target.value)}
                  options={[
                    { value: "", label: "…and someone else" },
                    ...participants.filter((g) => g.id !== pairA).map((g) => ({ value: g.id, label: g.name })),
                  ]}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                disabled={busy || !pairA || !pairB}
                onClick={async () => {
                  if (await run(() => actions.addExclusion(eventId, pairA, pairB))) {
                    setPairA("");
                    setPairB("");
                  }
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}

      {/* The draw */}
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-xl bg-primary p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary">
            {confirming === "draw" &&
              `Draw names for ${participants.length} people? Each gets an email with their person. You won't see who drew whom.`}
            {confirming === "again" &&
              "Draw again? Everyone in gets a new person and a new email, replacing the old one."}
            {confirming === "undo" &&
              "Undo the draw? Everyone's person is cleared, so you can change who's in. Nobody is emailed."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                confirming === "undo" ? run(() => actions.undo(eventId), "The draw is undone.") : draw(confirming === "again")
              }
            >
              <span className="inline-flex items-center gap-1.5">
                {busy && <Loader2 className="size-4 animate-spin" />}
                {confirming === "undo" ? "Undo the draw" : "Draw names"}
              </span>
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : drawn ? (
        <div className="flex flex-wrap gap-2">
          <Button variant={status.stale ? "default" : "outline"} onClick={() => setConfirming("again")}>
            <span className="inline-flex items-center gap-1.5">
              <Shuffle className="size-4" />
              Draw again
            </span>
          </Button>
          <Button variant="ghost" onClick={() => setConfirming("undo")}>
            Undo the draw
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <Button disabled={!enough} onClick={() => setConfirming("draw")}>
            <span className="inline-flex items-center gap-1.5">
              <Shuffle className="size-4" />
              Draw names
            </span>
          </Button>
          {!enough && (
            <p className="text-xs text-tertiary">
              A gift exchange needs at least {MIN_EXCHANGE_PARTICIPANTS} people.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
