"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { startPlan, type PlanInput } from "@/lib/actions/events";
import { themeForTint } from "@/lib/occasion-theme";
import {
  AUDIENCE_LABELS,
  GIFT_PLAN_LABELS,
  OCCASIONS,
  giftPlansFor,
  listTitleFor,
  nameLabelFor,
  occasionFor,
  planNeedsEvent,
  type Audience,
  type GiftPlan,
  type OccasionId,
} from "@/lib/occasions";
import { cx } from "@/lib/utils/cx";

type Step = "what" | "who" | "gifts" | "name";
const STEPS: { id: Step; label: string }[] = [
  { id: "what", label: "What" },
  { id: "who", label: "Who it's for" },
  { id: "gifts", label: "Gifts" },
  { id: "name", label: "Name it" },
];

// Occasions that are usually a party. For the rest, someone making a list for
// themselves often wants only the list, so "Also make an invitation" starts off.
const LIST_FIRST: readonly OccasionId[] = ["birthday", "christmas", "holiday", "other"];

export interface PlanPickerState {
  step: Step;
  occasion: OccasionId | null;
  audience: Audience | null;
  name: string;
  gifts: GiftPlan | null;
  invitation: boolean;
  linkUrl: string;
  askEmail: string;
  title: string;
  date: string;
}

const EMPTY: PlanPickerState = {
  step: "what",
  occasion: null,
  audience: null,
  name: "",
  gifts: null,
  invitation: true,
  linkUrl: "",
  askEmail: "",
  title: "",
  date: "",
};

function Choice({
  selected,
  onClick,
  label,
  hint,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        selected ? "border-brand-600 bg-brand-50" : "border-secondary hover:border-primary",
        className,
      )}
    >
      <span className="flex items-center gap-2 font-medium text-primary">
        {selected && <Check aria-hidden="true" className="size-4 text-brand-600" />}
        {label}
      </span>
      {hint && <span className="text-sm text-tertiary">{hint}</span>}
    </button>
  );
}

/**
 * "What are you planning?": the one New button's page. Three questions
 * (what, who it's for, how gifts work) and a name, then startPlan makes the
 * event, the gift list, or both, with the gift plan set up.
 */
export function PlanPicker({
  myName = "",
  initial,
  startAction = startPlan,
}: {
  /** The signed-in person's first name, for plans that are for them. */
  myName?: string;
  /** Stories start partway through. */
  initial?: Partial<PlanPickerState>;
  /** Makes the plan. Stories pass a stand-in. */
  startAction?: (input: PlanInput) => Promise<{ error: string | null; href?: string }>;
}) {
  const router = useRouter();
  const [state, setState] = useState<PlanPickerState>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const occasion = state.occasion ? occasionFor(state.occasion) : null;
  const audiences = (occasion?.audiences ?? []) as readonly Audience[];
  const giftPlans = state.audience ? giftPlansFor(state.audience) : [];
  const nameLabel = state.audience ? nameLabelFor(state.audience) : null;
  const withEvent = state.gifts ? planNeedsEvent(state.gifts) || state.invitation : true;

  const update = (changes: Partial<PlanPickerState>) => {
    setError("");
    setState((current) => ({ ...current, ...changes }));
  };

  /** The title the last step starts with. */
  const suggestedTitle = (next: PlanPickerState) => {
    if (!next.occasion) return "";
    const chosen = occasionFor(next.occasion);
    const event = next.gifts ? planNeedsEvent(next.gifts) || next.invitation : true;
    return event ? chosen.titleFor(next.name) : listTitleFor(chosen, next.name);
  };

  const goTo = (step: Step, changes: Partial<PlanPickerState> = {}) => {
    const next = { ...state, ...changes, step };
    if (step === "name") next.title = suggestedTitle(next);
    setError("");
    setState(next);
  };

  const chooseOccasion = (id: OccasionId) => {
    const chosen = occasionFor(id);
    const only = chosen.audiences.length === 1 ? chosen.audiences[0] : null;
    const changes: Partial<PlanPickerState> = {
      occasion: id,
      audience: only ?? (chosen.audiences.includes(state.audience as never) ? state.audience : chosen.audiences[0]),
      invitation: !LIST_FIRST.includes(id),
      gifts: null,
    };
    if (only === "everyone") {
      // A gift exchange: the only gift plan is drawing names.
      goTo("name", { ...changes, gifts: "exchange" });
    } else if (only) {
      goTo("gifts", changes);
    } else {
      goTo("who", { ...changes, name: changes.audience === "me" && !state.name ? myName : state.name });
    }
  };

  const chooseAudience = (audience: Audience) => {
    update({ audience, name: audience === "me" ? state.name || myName : state.name, gifts: null });
  };

  const afterWho = () => {
    if (nameLabel && !state.name.trim() && state.audience !== "me") {
      setError(`Add ${state.audience === "someone" ? "their name" : state.audience === "child" ? "your child's name" : "your names"}.`);
      return;
    }
    goTo("gifts");
  };

  const afterGifts = () => {
    if (!state.gifts) {
      setError("Choose how gifts work.");
      return;
    }
    if (state.gifts === "link" && !state.linkUrl.trim()) {
      setError("Paste the link to the list.");
      return;
    }
    if (state.gifts === "ask" && !state.askEmail.trim()) {
      setError("Add their email address, so we can ask them.");
      return;
    }
    goTo("name");
  };

  const back = () => {
    const order: Step[] = ["what", "who", "gifts", "name"];
    let index = order.indexOf(state.step) - 1;
    // Skip the steps the occasion answered by itself.
    if (order[index] === "gifts" && state.audience === "everyone") index -= 1;
    if (order[index] === "who" && audiences.length === 1) index -= 1;
    goTo(order[Math.max(index, 0)]);
  };

  const justAList = () => {
    goTo("name", { occasion: "other", audience: "me", name: state.name || myName, gifts: "new_list", invitation: false });
  };

  const make = async () => {
    if (!state.occasion || !state.audience || !state.gifts) return;
    setSaving(true);
    setError("");
    const result = await startAction({
      occasion: state.occasion,
      audience: state.audience,
      name: state.name,
      gifts: state.gifts,
      invitation: state.invitation,
      linkUrl: state.linkUrl,
      askEmail: state.askEmail,
      title: state.title,
      date: state.date,
    });
    if (result.error || !result.href) {
      setSaving(false);
      setError(result.error ?? "That didn't work. Try again.");
      return;
    }
    router.push(result.href);
  };

  const stepIndex = STEPS.findIndex((s) => s.id === state.step);

  // What the plan will make, for the last step.
  const summary: string[] = [];
  if (occasion && state.gifts) {
    if (withEvent) summary.push(`An invitation with RSVPs: “${state.title || suggestedTitle(state)}”`);
    if (state.gifts === "new_list") {
      summary.push(
        withEvent
          ? `Your ${occasion.list.noun}, “${listTitleFor(occasion, state.name)}”, linked to the invitation`
          : `Your ${occasion.list.noun}`,
      );
      if (state.audience === "child") summary.push("You'll always see what's been reserved, since you keep it for your child");
    }
    if (state.gifts === "link") summary.push("The list you pasted, linked to the invitation. Its owners get an email.");
    if (state.gifts === "ask") summary.push(`An email to ${state.askEmail || "them"} asking for a ${occasion.list.noun}`);
    if (state.gifts === "exchange") summary.push("A Secret Santa draw. Set the budget and draw date next.");
    if (state.gifts === "no_gifts") summary.push("A note on the invitation: “No gifts, please.”");
    if ("defaults" in occasion && occasion.defaults && "askKids" in occasion.defaults) {
      summary.push("The RSVP asks how many kids are coming");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ol aria-label="Steps" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STEPS.map((s, index) => (
          <li
            key={s.id}
            aria-current={s.id === state.step ? "step" : undefined}
            className={cx(
              "flex items-center gap-1.5",
              index === stepIndex ? "font-semibold text-primary" : index < stepIndex ? "text-secondary" : "text-tertiary",
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                "flex size-5 items-center justify-center rounded-full text-xs",
                index <= stepIndex ? "bg-brand-600 text-white" : "border border-secondary",
              )}
            >
              {index < stepIndex ? <Check className="size-3" /> : index + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      {state.step === "what" && (
        <section aria-labelledby="plan-what" className="flex flex-col gap-4">
          <h2 id="plan-what" className="text-xl font-semibold">
            What are you planning?
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {OCCASIONS.map((o) => {
              const theme = themeForTint(o.tint);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={state.occasion === o.id}
                  onClick={() => chooseOccasion(o.id)}
                  className={cx(
                    "flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium text-primary transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                    state.occasion === o.id ? "border-brand-600" : "border-secondary hover:border-primary",
                  )}
                >
                  <span aria-hidden="true" className={cx("size-3 shrink-0 rounded-full", theme.bg)} />
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-tertiary">
            Only want a wishlist for yourself?{" "}
            <button type="button" onClick={justAList} className="cursor-pointer font-medium text-brand-600 hover:underline">
              Make just a wishlist
            </button>
          </p>
        </section>
      )}

      {state.step === "who" && occasion && (
        <section aria-labelledby="plan-who" className="flex flex-col gap-4">
          <h2 id="plan-who" className="text-xl font-semibold">
            Who&apos;s the {occasion.label.toLowerCase()} for?
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {audiences.map((audience) => (
              <Choice
                key={audience}
                selected={state.audience === audience}
                onClick={() => chooseAudience(audience)}
                label={AUDIENCE_LABELS[audience]}
              />
            ))}
          </div>
          {nameLabel && (
            <Input
              label={nameLabel}
              value={state.name}
              onChange={(name) => update({ name })}
              maxLength={100}
              placeholder={state.audience === "us" ? 'e.g., "Alex & Sam"' : 'e.g., "Remi"'}
              className="sm:max-w-sm"
            />
          )}
        </section>
      )}

      {state.step === "gifts" && occasion && (
        <section aria-labelledby="plan-gifts" className="flex flex-col gap-4">
          <h2 id="plan-gifts" className="text-xl font-semibold">
            How do gifts work?
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {giftPlans.map((plan) => (
              <Choice
                key={plan}
                selected={state.gifts === plan}
                onClick={() => update({ gifts: plan })}
                label={
                  plan === "new_list" ? `Make ${state.audience === "child" ? "their" : "your"} ${occasion.list.noun}` : GIFT_PLAN_LABELS[plan].label
                }
                hint={GIFT_PLAN_LABELS[plan].hint}
              />
            ))}
          </div>
          {state.gifts === "link" && (
            <Input
              label="Link to the list"
              value={state.linkUrl}
              onChange={(linkUrl) => update({ linkUrl })}
              placeholder="regibee.com/r/remi-and-max-1a2b"
              hint="Linking shows the list to guests. It gives you no rights over it, and its owners get an email."
              className="sm:max-w-lg"
            />
          )}
          {state.gifts === "ask" && (
            <Input
              label={`${state.name.trim() || "Their"}${state.name.trim() ? "'s" : ""} email`}
              type="email"
              value={state.askEmail}
              onChange={(askEmail) => update({ askEmail })}
              autoComplete="off"
              hint={`We'll email them a link to make a ${occasion.list.noun}. It's linked to your invitation once they do.`}
              className="sm:max-w-lg"
            />
          )}
          {state.gifts === "new_list" && (
            <Checkbox
              isSelected={state.invitation}
              onChange={(invitation) => update({ invitation })}
              label="Also make an invitation"
              hint="Email guests an invitation with RSVPs, with your list on it. You can also add one later."
            />
          )}
        </section>
      )}

      {state.step === "name" && occasion && (
        <section aria-labelledby="plan-name" className="flex flex-col gap-4">
          <h2 id="plan-name" className="text-xl font-semibold">
            {withEvent ? "Name your event" : "Name your list"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Input
              label={withEvent ? "Event name" : "List name"}
              value={state.title}
              onChange={(title) => update({ title })}
              maxLength={120}
              placeholder={occasion.titlePlaceholder}
            />
            <Input label="Date (optional)" type="date" value={state.date} onChange={(date) => update({ date })} />
          </div>
          {summary.length > 0 && (
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-sm font-medium text-primary">This makes:</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-secondary">
                {summary.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-mint-700" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-tertiary">
                {withEvent
                  ? "Next you'll add guests, a place and time, and your invitation picture."
                  : "Next you'll add things from any store."}
              </p>
            </div>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}

      {state.step !== "what" && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={back} disabled={saving}>
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft className="size-4" />
              Back
            </span>
          </Button>
          {state.step === "who" && <Button onClick={afterWho}>Next</Button>}
          {state.step === "gifts" && <Button onClick={afterGifts}>Next</Button>}
          {state.step === "name" && (
            <Button onClick={make} disabled={saving || !state.title.trim()}>
              <span className="inline-flex items-center gap-1.5">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Making it…" : withEvent ? "Make the event" : "Make the list"}
              </span>
            </Button>
          )}
        </div>
      )}

      <p className="border-t border-secondary pt-4 text-sm text-tertiary">
        Rather fill in everything yourself?{" "}
        <Link href="/dashboard/registry/new" className="font-medium text-brand-600 hover:underline">
          Make a registry
        </Link>{" "}
        or{" "}
        <Link href="/dashboard/events/new" className="font-medium text-brand-600 hover:underline">
          plan an event
        </Link>{" "}
        with the full form.
      </p>
    </div>
  );
}
