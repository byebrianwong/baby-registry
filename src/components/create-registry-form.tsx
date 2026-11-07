"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Baby, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { ProfileListingField } from "@/components/profile-listing-field";
import { createRegistry } from "@/lib/actions/registry";
import { PERSONAL_EVENT_TYPE_OPTIONS, copyFor } from "@/lib/registry-copy";
import type { PersonalEventType, RegistryType } from "@/lib/types";
import { cx } from "@/lib/utils/cx";

// The form is a stack of sections, like a checkout page. One section is open at
// a time. Finishing a section closes it and opens the next one the person hasn't
// been to yet. Only the type and the name are required, so Create works as soon
// as there is a name. Every field stays in the form while its section is closed,
// so closed sections still submit their values.

type SectionId = "type" | "details" | "privacy" | "welcome" | "payments";

const SECTION_ORDER: SectionId[] = ["type", "details", "privacy", "welcome", "payments"];

// How long a choice stays on screen before its section closes, so the person
// sees what they picked.
const ADVANCE_DELAY_MS = 350;

type NavState = { open: SectionId | null; visited: ReadonlySet<SectionId> };
type NavAction =
  | { type: "finish"; id: SectionId }
  | { type: "toggle"; id: SectionId }
  | { type: "open"; id: SectionId };

// The next section after `after` that hasn't been visited. If every later
// section has been visited, go back to the first one that hasn't. Null means
// every section has been visited.
function nextUnvisited(after: SectionId, visited: ReadonlySet<SectionId>): SectionId | null {
  const index = SECTION_ORDER.indexOf(after);
  return (
    SECTION_ORDER.slice(index + 1).find((id) => !visited.has(id)) ??
    SECTION_ORDER.find((id) => !visited.has(id)) ??
    null
  );
}

function navReducer(state: NavState, action: NavAction): NavState {
  // Leaving the open section counts as visiting it, however the person left.
  const visited = state.open ? new Set(state.visited).add(state.open) : state.visited;
  switch (action.type) {
    case "finish":
      // A delayed advance can fire after the person has already moved on.
      if (state.open !== action.id) return state;
      return { open: nextUnvisited(action.id, visited), visited };
    case "toggle":
      return { open: state.open === action.id ? null : action.id, visited };
    case "open":
      return { open: action.id, visited };
  }
}

// While someone types a year, a date input reports partial years such as
// "0002", "0020" and "0202". Count the date as finished once the year has four
// real digits.
function isFinishedDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1000;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SectionStatus = "open" | "done" | "skipped" | "incomplete" | "upcoming";

function StepMarker({ step, status }: { step: number; status: SectionStatus }) {
  if (status === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint-500 text-brand-900">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={cx(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        status === "open" && "bg-brand-600 text-white",
        status === "incomplete" && "bg-error-secondary text-error-primary ring-1 ring-error ring-inset",
        (status === "upcoming" || status === "skipped") && "text-tertiary ring-1 ring-secondary ring-inset",
      )}
    >
      {step}
    </span>
  );
}

function Section({
  step,
  title,
  optional = false,
  status,
  summary,
  onToggle,
  onKeyDown,
  sectionRef,
  children,
}: {
  step: number;
  title: string;
  optional?: boolean;
  status: SectionStatus;
  summary?: ReactNode;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  sectionRef: Ref<HTMLElement>;
  children: ReactNode;
}) {
  const id = useId();
  const headerId = `${id}-header`;
  const panelId = `${id}-panel`;
  const isOpen = status === "open";

  return (
    <section
      ref={sectionRef}
      data-state={isOpen ? "open" : "closed"}
      className={cx(
        "rounded-xl border bg-primary transition-shadow duration-200",
        isOpen ? "border-brand-600 shadow-md ring-1 ring-brand-600" : "border-secondary",
      )}
    >
      <h2>
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <StepMarker step={step} status={status} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  "text-md font-medium",
                  status === "upcoming" ? "text-tertiary" : "text-primary",
                )}
              >
                {title}
              </span>
              {optional && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-tertiary">
                  Optional
                </span>
              )}
            </span>
            {!isOpen && summary && (
              <span className="mt-0.5 block truncate text-sm font-normal text-tertiary">{summary}</span>
            )}
          </span>
          {!isOpen && status !== "upcoming" && (
            <span className="shrink-0 text-sm font-medium text-brand-600">
              {status === "skipped" ? "Add" : "Edit"}
            </span>
          )}
        </button>
      </h2>
      <div
        className={cx(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          inert={!isOpen}
          onKeyDown={onKeyDown}
          className="min-h-0 overflow-hidden"
        >
          <div className="px-4 pt-1 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function SectionFooter({
  label,
  onClick,
  primary = true,
  enterHint = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  enterHint?: boolean;
}) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <Button
        type="button"
        variant={primary ? "default" : "outline"}
        onClick={onClick}
      >
        {label}
      </Button>
      {enterHint && <span className="hidden text-xs text-tertiary sm:inline">or press Enter</span>}
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-autofocus={selected || undefined}
      onClick={onClick}
      className={cx(
        "flex cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
        selected
          ? "border-brand-600 bg-brand-600/5 ring-1 ring-brand-600"
          : "border-secondary hover:border-primary",
      )}
    >
      <span className="flex items-center gap-2 font-medium text-primary">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-xs text-tertiary">{description}</span>
    </button>
  );
}

export interface CreateRegistryFormProps {
  /** The owner's profile username, or null if they haven't set up a profile. */
  username: string | null;
  createAction?: (formData: FormData) => Promise<{ error?: string } | void>;
}

export function CreateRegistryForm({
  username,
  createAction = createRegistry,
}: CreateRegistryFormProps) {
  const [registryType, setRegistryType] = useState<RegistryType>("baby");
  const [eventType, setEventType] = useState<PersonalEventType | "">("");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [listedChoice, setListedChoice] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [venmo, setVenmo] = useState("");
  const [paypal, setPaypal] = useState("");
  const [zelle, setZelle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [nav, dispatch] = useReducer(navReducer, { open: "type", visited: new Set<SectionId>() });

  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Don't move focus on first load. Only after the person starts using the form.
  const hasInteracted = useRef(false);

  // Personal registries are shown on the profile by default. Baby registries
  // aren't, because showing one could announce a pregnancy.
  const isListed = listedChoice ?? registryType === "personal";

  const copy = copyFor({
    registryType,
    eventType: registryType === "personal" && eventType ? eventType : null,
  });

  const cancelAdvance = () => {
    clearTimeout(advanceTimer.current);
    advanceTimer.current = undefined;
  };
  useEffect(() => cancelAdvance, []);

  const move = (action: NavAction) => {
    cancelAdvance();
    hasInteracted.current = true;
    dispatch(action);
  };

  // Close a section after a short pause, once the person has made a choice.
  const advanceSoon = (id: SectionId, delay = ADVANCE_DELAY_MS) => {
    cancelAdvance();
    advanceTimer.current = setTimeout(() => {
      hasInteracted.current = true;
      dispatch({ type: "finish", id });
    }, delay);
  };

  const finish = (id: SectionId) => {
    if (id === "details" && !title.trim()) {
      cancelAdvance();
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    move({ type: "finish", id });
  };

  // When a section opens, put the cursor in its first field. When every section
  // is done, move to the Create button.
  useEffect(() => {
    if (!hasInteracted.current) return;
    const target = nav.open ? sectionRefs.current[nav.open] : createRef.current;
    if (!target) return;
    const field =
      target.querySelector<HTMLElement>("[data-autofocus]") ??
      target.querySelector<HTMLElement>(
        '[role="region"] input:not([type="hidden"]), [role="region"] textarea, [role="region"] button, button[type="submit"]',
      );
    field?.focus({ preventScroll: true });
    // Wait for the closing section to finish shrinking before scrolling.
    const timer = setTimeout(() => {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 220);
    return () => clearTimeout(timer);
  }, [nav.open]);

  // Enter in a text field finishes the section instead of submitting the form.
  // In the welcome message, Enter adds a line, so Cmd or Ctrl + Enter finishes.
  const onSectionKeyDown = (id: SectionId) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;
    const tag = (event.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" && !(event.metaKey || event.ctrlKey)) return;
    if (tag !== "INPUT" && tag !== "TEXTAREA") return;
    event.preventDefault();
    finish(id);
  };

  const chooseRegistryType = (type: RegistryType) => {
    if (type === "baby" || registryType === "personal") {
      // Baby has nothing more to pick. Clicking Personal again means the
      // person is happy with the occasion they already have.
      advanceSoon("type");
    } else {
      cancelAdvance();
    }
    if (type !== registryType) {
      setRegistryType(type);
      setListedChoice(null);
    }
  };

  const chooseOccasion = (value: PersonalEventType | "") => {
    setEventType(value);
    advanceSoon("type");
  };

  const changeEventDate = (value: string) => {
    setEventDate(value);
    cancelAdvance();
    if (!isFinishedDate(value)) return;
    if (title.trim()) {
      advanceSoon("details", 500);
    } else {
      titleRef.current?.focus();
    }
  };

  const chooseVisibility = (value: boolean) => {
    setIsPublic(value);
    // With no profile, visibility is the only choice in this section.
    if (!username) advanceSoon("privacy");
  };

  // The zip code is the last field in the payments section, so a full zip
  // code finishes the section.
  const changeZipCode = (value: string) => {
    setZipCode(value);
    cancelAdvance();
    if (/^\d{5}$/.test(value.trim())) advanceSoon("payments");
  };

  const handleSubmit = async (formData: FormData) => {
    if (!title.trim()) {
      setTitleError(true);
      if (nav.open === "details") {
        titleRef.current?.focus();
      } else {
        move({ type: "open", id: "details" });
      }
      return;
    }
    setLoading(true);
    setError("");
    const result = await createAction(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const hasWelcome = Boolean(description.trim());
  const hasZip = Boolean(zipCode.trim());
  const paymentNames = [
    venmo.trim() && "Venmo",
    paypal.trim() && "PayPal",
    zelle.trim() && "Zelle",
  ].filter(Boolean) as string[];

  const sections: Record<SectionId, { complete: boolean; optional: boolean; hasContent: boolean }> = {
    type: { complete: true, optional: false, hasContent: true },
    details: { complete: Boolean(title.trim()), optional: false, hasContent: Boolean(title.trim()) },
    privacy: { complete: true, optional: false, hasContent: true },
    welcome: { complete: true, optional: true, hasContent: hasWelcome },
    payments: { complete: true, optional: true, hasContent: paymentNames.length > 0 || hasZip },
  };

  const statusOf = (id: SectionId): SectionStatus => {
    if (nav.open === id) return "open";
    if (!nav.visited.has(id)) return "upcoming";
    if (!sections[id].complete) return "incomplete";
    if (sections[id].optional && !sections[id].hasContent) return "skipped";
    return "done";
  };

  // The label for a section's button. "Skip" while an optional section is
  // empty, and "Done" when no unvisited section is left after this one.
  const footerLabel = (id: SectionId) => {
    if (sections[id].optional && !sections[id].hasContent) return "Skip";
    const visited = new Set(nav.visited).add(id);
    return nextUnvisited(id, visited) ? "Continue" : "Done";
  };

  const occasion = PERSONAL_EVENT_TYPE_OPTIONS.find((option) => option.value === eventType);
  const privacySummary = [
    isPublic ? "Public" : "Private",
    username ? (isListed ? "on your profile" : "not on your profile") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const summaries: Record<SectionId, ReactNode> = {
    type:
      registryType === "baby"
        ? "Baby"
        : `Personal · ${occasion ? occasion.label : "No specific occasion"}`,
    details: sections.details.complete ? (
      [title.trim(), eventDate ? formatDate(eventDate) : null].filter(Boolean).join(" · ")
    ) : (
      <span className="text-error-primary">Needs a name</span>
    ),
    privacy: privacySummary,
    welcome: hasWelcome ? description.trim() : "Skipped",
    payments:
      [
        paymentNames.length > 0 ? paymentNames.join(", ") : null,
        hasZip ? `Sales tax for ${zipCode.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Skipped",
  };

  // Upcoming sections show no summary, except Privacy, which shows the defaults
  // the person gets if they skip it.
  const summaryFor = (id: SectionId) => {
    const status = statusOf(id);
    if (status === "upcoming") return id === "privacy" ? summaries.privacy : undefined;
    return summaries[id];
  };

  const sectionProps = (id: SectionId) => ({
    step: SECTION_ORDER.indexOf(id) + 1,
    status: statusOf(id),
    summary: summaryFor(id),
    onToggle: () => move({ type: "toggle", id }),
    onKeyDown: onSectionKeyDown(id),
    sectionRef: (element: HTMLElement | null) => {
      sectionRefs.current[id] = element;
    },
  });

  const Icon = registryType === "baby" ? Baby : Gift;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      {/* onSubmit, not action: React resets a form after its action runs, which
          would clear every field if creating the registry fails. noValidate,
          because the browser can't point at a required field in a closed
          section. handleSubmit checks the name instead. */}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="registryType" value={registryType} />
        {registryType === "personal" && <input type="hidden" name="eventType" value={eventType} />}
        <input type="hidden" name="isPublic" value={isPublic ? "true" : "false"} />
        {/* The zip code is only used for tax estimates, so entering one turns them on. */}
        <input type="hidden" name="taxEnabled" value={hasZip ? "true" : "false"} />

        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/10">
            <Icon className="h-6 w-6 text-brand-600" />
          </div>
          <h1 className="text-2xl font-medium text-primary">Create Your Registry</h1>
          <p className="text-xs text-tertiary">{copy.tagline}</p>
        </div>

        <div className="space-y-3">
          <Section title="Registry type" {...sectionProps("type")}>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard
                selected={registryType === "baby"}
                onClick={() => chooseRegistryType("baby")}
                icon={<Baby className="h-4 w-4" />}
                title="Baby"
                description="Baby shower, expecting a new arrival"
              />
              <ChoiceCard
                selected={registryType === "personal"}
                onClick={() => chooseRegistryType("personal")}
                icon={<Gift className="h-4 w-4" />}
                title="Personal"
                description="Birthday, Christmas, wedding, housewarming, more"
              />
            </div>

            {registryType === "personal" && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-secondary">What&apos;s the occasion?</p>
                <div className="flex flex-wrap gap-2">
                  {[...PERSONAL_EVENT_TYPE_OPTIONS, { value: "" as const, label: "No specific occasion" }].map(
                    (option) => {
                      const selected = eventType === option.value;
                      return (
                        <button
                          key={option.value || "none"}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => chooseOccasion(option.value)}
                          className={cx(
                            "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
                            selected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-secondary text-secondary hover:border-primary",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    },
                  )}
                </div>
                <p className="text-xs text-tertiary">Tunes labels and placeholders.</p>
              </div>
            )}
          </Section>

          <Section title="Name and date" {...sectionProps("details")}>
            <div className="space-y-4">
              <Input
                ref={titleRef}
                label="Registry name"
                name="title"
                placeholder={copy.titlePlaceholder}
                isRequired
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  if (value.trim()) setTitleError(false);
                }}
                isInvalid={titleError}
                hint={titleError ? "Add a name to continue." : undefined}
              />
              <Input
                label={`${copy.eventDateLabel} (optional)`}
                name="eventDate"
                type="date"
                value={eventDate}
                onChange={changeEventDate}
                hint={copy.eventDatePlaceholderHint}
              />
            </div>
            <SectionFooter label={footerLabel("details")} onClick={() => finish("details")} enterHint />
          </Section>

          <Section title="Who can see it" {...sectionProps("privacy")}>
            <p className="mb-3 text-sm text-tertiary">
              Anyone with your share link can open it either way.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard
                selected={isPublic}
                onClick={() => chooseVisibility(true)}
                title="Public"
                description="Search engines can list it."
              />
              <ChoiceCard
                selected={!isPublic}
                onClick={() => chooseVisibility(false)}
                title="Private"
                description="Hidden from search engines. Only followers you approve see it on your profile."
              />
            </div>
            <div className="mt-4">
              <ProfileListingField
                username={username}
                isPublic={isPublic}
                isSelected={isListed}
                onChange={setListedChoice}
              />
            </div>
            <SectionFooter label={footerLabel("privacy")} onClick={() => finish("privacy")} />
          </Section>

          <Section title="Welcome message" optional {...sectionProps("welcome")}>
            <TextArea
              label="Message to guests"
              name="description"
              placeholder="Say hello to the people visiting your registry"
              rows={4}
              value={description}
              onChange={setDescription}
              hint="Shown at the top of your registry page."
            />
            <SectionFooter
              label={footerLabel("welcome")}
              onClick={() => finish("welcome")}
              primary={hasWelcome}
            />
          </Section>

          <Section title="Payments and sales tax" optional {...sectionProps("payments")}>
            <p className="mb-3 text-sm text-tertiary">
              So guests can send money for cash funds and things you&apos;ve already bought.
            </p>
            <div className="space-y-4">
              <Input label="Venmo" name="venmo" placeholder="@your-venmo" value={venmo} onChange={setVenmo} />
              <Input
                label="PayPal"
                name="paypal"
                placeholder="you@email.com or PayPal.me link"
                value={paypal}
                onChange={setPaypal}
              />
              <Input
                label="Zelle"
                name="zelle"
                placeholder="you@email.com or phone number"
                value={zelle}
                onChange={setZelle}
              />
              <Input
                label="Zip code"
                name="zipCode"
                placeholder="12345"
                inputMode="numeric"
                autoComplete="postal-code"
                value={zipCode}
                onChange={changeZipCode}
                hint="When you add something you've already bought, we'll add estimated sales tax to its price. You can turn this off later in settings."
              />
            </div>
            <SectionFooter
              label={footerLabel("payments")}
              onClick={() => finish("payments")}
              primary={sections.payments.hasContent}
              enterHint={sections.payments.hasContent}
            />
          </Section>
        </div>

        <div ref={createRef} className="mt-6 space-y-3">
          {error && <p className="text-sm text-error-primary">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Registry"}
          </Button>
          <p className="text-center text-xs text-tertiary">
            Only the name is required. You can change all of this later in settings.
          </p>
        </div>
      </form>
    </div>
  );
}
