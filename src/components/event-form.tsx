"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gift, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { createEvent, lookupRegistryLink, setEventImage, updateEvent } from "@/lib/actions/events";
import { uploadEventImage } from "@/lib/upload-event-image";
import type { PhotoUploadResult } from "@/lib/upload-registry-photo";
import {
  COMMON_TIME_ZONES,
  EVENT_TYPE_OPTIONS,
  EXCHANGE_KINDS,
  exchangeKind,
  GIFT_NOTE_PRESETS,
  MAX_GIFT_NOTE_LENGTH,
  MAX_PARTY_SIZE_LIMIT,
  type EventDetails,
  type EventType,
  type ExchangeKind,
  type GiftExchange,
} from "@/lib/events";
import { cx } from "@/lib/utils/cx";

type Values = Pick<
  EventDetails,
  | "event_type"
  | "title"
  | "hosted_by"
  | "event_date"
  | "start_time"
  | "end_time"
  | "time_zone"
  | "location_name"
  | "location_address"
  | "message"
  | "image_url"
  | "rsvp_by"
  | "max_party_size"
  | "open_rsvp"
  | "email_host_on_rsvp"
  | "registry_id"
  | "gift_note"
  | "ask_kids"
>;

/** A registry on the form's list of links. */
export interface FormRegistry {
  id: string;
  title: string;
  /** Whose list it is, when it isn't the host's: "Remi & Max". */
  honoree?: string | null;
  /** Set for a registry added by pasting its link, which is how the server checks it. */
  link?: string;
}

type LookupAction = (
  link: string,
) => Promise<{ error: string } | { error: null; registry: { id: string; title: string; honoree: string | null } }>;

type ActionResult = { error: string | null };

export interface EventFormProps {
  /** The event being edited. Without it, the form makes a new one. */
  eventId?: string;
  initial?: Partial<Values>;
  /** Registries the person manages, to pick from. */
  registries: { id: string; title: string }[];
  /** The registries the event links now, in order. */
  linkedRegistries?: FormRegistry[];
  /** The event's gift exchange, when it has one. */
  exchange?: Pick<GiftExchange, "kind" | "budget" | "draw_by" | "mailed" | "drawn_at"> | null;
  createAction?: (formData: FormData) => Promise<ActionResult & { id?: string }>;
  lookupAction?: LookupAction;
  updateAction?: (eventId: string, formData: FormData) => Promise<ActionResult>;
  setImageAction?: (eventId: string, url: string | null) => Promise<ActionResult>;
  uploadImage?: (eventId: string, file: File) => Promise<PhotoUploadResult>;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-secondary bg-primary p-5">
      <h2 className="text-md font-semibold text-primary">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Creates or edits an event. The picture uploads once the event is saved. */
export function EventForm({
  eventId,
  initial = {},
  registries,
  linkedRegistries,
  exchange = null,
  createAction = createEvent,
  lookupAction = lookupRegistryLink,
  updateAction = updateEvent,
  setImageAction = setEventImage,
  uploadImage = uploadEventImage,
}: EventFormProps) {
  const router = useRouter();
  const editing = Boolean(eventId);
  const [eventType, setEventType] = useState<EventType>(initial.event_type ?? "baby_shower");
  const [title, setTitle] = useState(initial.title ?? "");
  const [hostedBy, setHostedBy] = useState(initial.hosted_by ?? "");
  const [eventDate, setEventDate] = useState(initial.event_date ?? "");
  const [startTime, setStartTime] = useState(initial.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(initial.end_time?.slice(0, 5) ?? "");
  const [timeZone, setTimeZone] = useState(initial.time_zone ?? "");
  const [locationName, setLocationName] = useState(initial.location_name ?? "");
  const [locationAddress, setLocationAddress] = useState(initial.location_address ?? "");
  const [message, setMessage] = useState(initial.message ?? "");
  const [rsvpBy, setRsvpBy] = useState(initial.rsvp_by ?? "");
  const [maxPartySize, setMaxPartySize] = useState(String(initial.max_party_size ?? 2));
  const [openRsvp, setOpenRsvp] = useState(initial.open_rsvp ?? true);
  const [emailHost, setEmailHost] = useState(initial.email_host_on_rsvp ?? true);
  const [askKids, setAskKids] = useState(initial.ask_kids ?? false);
  const [giftNote, setGiftNote] = useState(initial.gift_note ?? "");

  // Linked registries. "Plan an event" on a registry's page starts with that one.
  const [linked, setLinked] = useState<FormRegistry[]>(() => {
    if (linkedRegistries) return linkedRegistries;
    const start = registries.find((r) => r.id === initial.registry_id);
    return start ? [{ id: start.id, title: start.title }] : [];
  });
  const [pasted, setPasted] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [linkError, setLinkError] = useState("");

  // The gift exchange.
  const [exchangeOn, setExchangeOn] = useState(Boolean(exchange));
  // A Secret Santa occasion draws names. Anything else, like a family
  // Christmas, starts with everyone giving everyone.
  const [kind, setKind] = useState<ExchangeKind>(
    exchange ? exchangeKind(exchange) : initial.event_type === "gift_exchange" ? "draw" : "everyone",
  );
  const [budget, setBudget] = useState(exchange?.budget ?? "");
  const [drawBy, setDrawBy] = useState(exchange?.draw_by ?? "");
  const [mailed, setMailed] = useState(exchange?.mailed ?? false);
  const drawn = Boolean(exchange?.drawn_at);
  // Choosing an occasion on a new event sets its defaults, but never undoes
  // a choice the host made themselves.
  const [touched, setTouched] = useState({ exchange: false, askKids: false });

  // The picture: the saved one, or a new file waiting to upload on save.
  const [imageUrl, setImageUrl] = useState<string | null>(initial.image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // New events start in the browser's own time zone. Done after the first
  // render, so the server's HTML and the browser's agree.
  useEffect(() => {
    if (!initial.time_zone) {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [initial.time_zone]);

  useEffect(() => {
    if (!imageFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const zoneOptions = [...COMMON_TIME_ZONES];
  if (timeZone && !zoneOptions.some((z) => z.value === timeZone)) {
    zoneOptions.unshift({ value: timeZone, label: timeZone.replaceAll("_", " ") });
  }

  const typeOption = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType) ?? EVENT_TYPE_OPTIONS[0];
  const shownImage = preview ?? imageUrl;
  const pickable = registries.filter((r) => !linked.some((l) => l.id === r.id));

  const chooseType = (type: EventType) => {
    setEventType(type);
    if (editing) return;
    const defaults = EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.defaults ?? {};
    if (!touched.exchange) {
      setExchangeOn(Boolean(defaults.exchange));
      setKind(type === "gift_exchange" ? "draw" : "everyone");
    }
    if (!touched.askKids) setAskKids(Boolean(defaults.askKids));
  };

  const addPastedLink = async () => {
    const link = pasted.trim();
    if (!link) return;
    setLookingUp(true);
    setLinkError("");
    const result = await lookupAction(link);
    setLookingUp(false);
    if (result.error !== null) {
      setLinkError(result.error);
      return;
    }
    if (!linked.some((l) => l.id === result.registry.id)) {
      setLinked([...linked, { ...result.registry, link }]);
    }
    setPasted("");
  };

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't a picture. Choose a JPEG, PNG, WebP or GIF image.");
      return;
    }
    setError("");
    setImageFile(file);
  };

  const formData = () => {
    const data = new FormData();
    data.set("eventType", eventType);
    data.set("title", title);
    data.set("hostedBy", hostedBy);
    data.set("eventDate", eventDate);
    data.set("startTime", startTime);
    data.set("endTime", endTime);
    data.set("timeZone", timeZone);
    data.set("locationName", locationName);
    data.set("locationAddress", locationAddress);
    data.set("message", message);
    data.set("rsvpBy", rsvpBy);
    data.set("maxPartySize", maxPartySize);
    data.set("openRsvp", String(openRsvp));
    data.set("emailHostOnRsvp", String(emailHost));
    data.set("askKids", String(askKids));
    data.set("giftNote", giftNote);
    data.set("registryLinks", JSON.stringify(linked.map((r) => (r.link ? { link: r.link } : { id: r.id }))));
    data.set("exchangeEnabled", String(exchangeOn));
    data.set("exchangeKind", kind);
    data.set("exchangeBudget", budget);
    data.set("exchangeDrawBy", drawBy);
    data.set("exchangeMailed", String(mailed));
    return data;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give your event a name.");
      return;
    }
    setSaving(true);
    setError("");

    if (eventId) {
      const data = formData();
      if (imageFile) {
        const upload = await uploadImage(eventId, imageFile);
        if ("error" in upload) {
          setError(upload.error);
          setSaving(false);
          return;
        }
        data.set("imageUrl", upload.url);
      } else if (!imageUrl && initial.image_url) {
        data.set("imageUrl", "");
      }
      const result = await updateAction(eventId, data);
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.push(`/dashboard/events/${eventId}`);
      return;
    }

    const created = await createAction(formData());
    if (created.error || !created.id) {
      setError(created.error ?? "The event wasn't saved. Try again.");
      setSaving(false);
      return;
    }
    // The event exists now, so its folder takes uploads. If the picture fails,
    // the event is still saved: the event page asks for the picture again.
    let imageFailed = false;
    if (imageFile) {
      const upload = await uploadImage(created.id, imageFile);
      imageFailed = "error" in upload || Boolean((await setImageAction(created.id, upload.url)).error);
    }
    router.push(`/dashboard/events/${created.id}${imageFailed ? "?image=failed" : ""}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Section title="What are you celebrating?">
        <div role="group" aria-label="Occasion" className="flex flex-wrap gap-2">
          {EVENT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={eventType === option.value}
              onClick={() => chooseType(option.value)}
              className={cx(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600 max-sm:min-h-11",
                eventType === option.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-secondary text-secondary hover:border-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Input
          label="Event name"
          value={title}
          onChange={setTitle}
          isRequired
          maxLength={120}
          placeholder={typeOption.titlePlaceholder}
        />
        <Input
          label="Hosted by (optional)"
          value={hostedBy}
          onChange={setHostedBy}
          maxLength={120}
          placeholder='e.g., "Aunt Linda & Grandma Jo"'
          hint="Guests see this on the invitation. Emails come from this name."
        />
      </Section>

      <Section
        title="Invitation"
        description="Upload the invitation you designed, or a photo. Guests see it at the top of the event page and in their email."
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            pickImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {shownImage ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview or an uploaded picture */}
            <img
              src={shownImage}
              alt="Invitation preview"
              className="max-h-72 w-auto max-w-full rounded-lg shadow-sm ring-1 ring-black/5"
            />
            <div className="flex gap-2 sm:flex-col">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <span className="inline-flex items-center gap-1.5">
                  <ImagePlus className="size-4 shrink-0" />
                  Change
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImageFile(null);
                  setImageUrl(null);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Trash2 className="size-4 shrink-0" />
                  Remove
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickImage(e.dataTransfer.files?.[0]);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-secondary px-4 py-10 text-center transition outline-none hover:border-brand-600 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <ImagePlus aria-hidden="true" className="size-8 text-brand-600" />
            <span className="font-medium text-primary">Upload your invitation</span>
            <span className="text-sm text-tertiary">JPEG, PNG, WebP or GIF. Click or drop a file here.</span>
          </button>
        )}
      </Section>

      <Section title="When">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" value={eventDate} onChange={setEventDate} />
          <NativeSelect
            label="Time zone"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            options={zoneOptions}
          />
          <Input label="Starts" type="time" value={startTime} onChange={setStartTime} />
          <Input label="Ends (optional)" type="time" value={endTime} onChange={setEndTime} />
        </div>
      </Section>

      <Section title="Where">
        <Input
          label="Place"
          value={locationName}
          onChange={setLocationName}
          maxLength={120}
          placeholder={`e.g., "Grandma's house" or "The Garden Room"`}
        />
        <TextArea
          label="Address"
          value={locationAddress}
          onChange={setLocationAddress}
          maxLength={300}
          rows={2}
          placeholder={"123 Main St\nSan Francisco, CA 94102"}
          hint="Only people with the event link see it. Guests get a map link."
        />
      </Section>

      <Section title="Message to guests" description="Parking, dress code, what to bring: anything guests should know.">
        <TextArea
          aria-label="Message to guests"
          value={message}
          onChange={setMessage}
          maxLength={2000}
          rows={4}
          placeholder="Join us for brunch and games as we celebrate Remi! Street parking is easiest."
        />
      </Section>

      <Section title="RSVPs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Reply by (optional)" type="date" value={rsvpBy} onChange={setRsvpBy} />
          <NativeSelect
            label="People per RSVP"
            hint="Including the guest. 2 lets each guest bring one person."
            value={maxPartySize}
            onChange={(e) => setMaxPartySize(e.target.value)}
            options={Array.from({ length: MAX_PARTY_SIZE_LIMIT }, (_, i) => ({
              value: String(i + 1),
              label: i === 0 ? "1 (just the guest)" : String(i + 1),
            }))}
          />
        </div>
        <Checkbox
          isSelected={openRsvp}
          onChange={setOpenRsvp}
          label={<span className="font-normal">Anyone with the event link can RSVP</span>}
          hint="They're added to your guest list. Turn this off to take RSVPs only from guests you invite."
        />
        <Checkbox
          isSelected={askKids}
          onChange={(value) => {
            setAskKids(value);
            setTouched((t) => ({ ...t, askKids: true }));
          }}
          label={<span className="font-normal">Ask how many kids are coming</span>}
          hint="Guests say how many of their party are kids, and you see both counts."
        />
        <Checkbox
          isSelected={emailHost}
          onChange={setEmailHost}
          label={<span className="font-normal">Email me when someone RSVPs</span>}
        />
      </Section>

      <Section title="Gifts" description="What guests see about gifts, under the details on the invitation.">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-secondary">Registries and wishlists</p>
            <p className="text-sm text-tertiary">
              Link yours, or someone else&apos;s with its link, like the parents&apos; registry for a baby shower.
              They get an email saying you linked it. Linking doesn&apos;t let you change their registry.
            </p>
          </div>
          {linked.length > 0 && (
            <ul className="flex flex-col gap-2">
              {linked.map((registry) => (
                <li
                  key={registry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-secondary px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Gift aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-primary">{registry.title}</span>
                      {registry.honoree && <span className="block truncate text-sm text-tertiary">{registry.honoree}</span>}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinked(linked.filter((l) => l.id !== registry.id))}
                    aria-label={`Unlink ${registry.title}`}
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-tertiary hover:bg-secondary hover:text-primary max-sm:size-11"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pickable.length > 0 && (
            <NativeSelect
              aria-label="Add one of your registries"
              value=""
              onChange={(e) => {
                const picked = registries.find((r) => r.id === e.target.value);
                if (picked) setLinked([...linked, { id: picked.id, title: picked.title }]);
              }}
              options={[
                { value: "", label: linked.length > 0 ? "Add another of your registries…" : "Add one of your registries…" },
                ...pickable.map((r) => ({ value: r.id, label: r.title })),
              ]}
            />
          )}
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Or paste a registry link"
                value={pasted}
                onChange={(value) => {
                  setPasted(value);
                  setLinkError("");
                }}
                placeholder="regibee.com/r/remi-and-max-1a2b"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addPastedLink();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={addPastedLink}
              disabled={lookingUp || !pasted.trim()}
            >
              {lookingUp ? "Finding…" : "Link"}
            </Button>
          </div>
          {linkError && (
            <p role="alert" className="text-sm text-error-primary">
              {linkError}
            </p>
          )}
          {registries.length === 0 && linked.length === 0 && (
            <p className="text-sm text-tertiary">
              Don&apos;t have a registry yet?{" "}
              <Link href="/dashboard/registry/new" className="font-medium text-brand-600 hover:underline">
                Create one
              </Link>{" "}
              and link it here later.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-secondary">Gift note (optional)</p>
          <div role="group" aria-label="Ready-made gift notes" className="flex flex-wrap gap-2">
            {GIFT_NOTE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setGiftNote(preset.text)}
                className="cursor-pointer rounded-full border border-secondary px-3 py-1 text-sm text-secondary transition hover:border-primary max-sm:min-h-11"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <TextArea
            aria-label="Gift note"
            value={giftNote}
            onChange={setGiftNote}
            maxLength={MAX_GIFT_NOTE_LENGTH}
            rows={2}
            placeholder="Instead of a card, bring a favorite children's book with a note inside."
          />
        </div>
      </Section>

      <Section
        title="Gifts among the guests"
        description="For a family Christmas or a Secret Santa, when the guests give gifts to each other."
      >
        <Checkbox
          isSelected={exchangeOn}
          isDisabled={drawn}
          onChange={(value) => {
            setExchangeOn(value);
            setTouched((t) => ({ ...t, exchange: true }));
          }}
          label={<span className="font-normal">Guests give gifts to each other</span>}
          hint={
            drawn
              ? "Names have been drawn. To turn this off, undo the draw on the event's page first."
              : "Guests add a wish list or gift ideas when they RSVP."
          }
        />
        {exchangeOn && (
          <>
            <div role="group" aria-label="How gifts work" className="grid gap-2 sm:grid-cols-2">
              {EXCHANGE_KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={kind === option.value}
                  disabled={drawn && kind !== option.value}
                  onClick={() => setKind(option.value)}
                  className={cx(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50",
                    kind === option.value
                      ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                      : "border-secondary hover:border-primary",
                  )}
                >
                  <span className="font-medium text-primary">{option.label}</span>
                  <span className="text-sm text-tertiary">{option.hint}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={kind === "everyone" ? "Budget per gift (optional)" : "Budget (optional)"}
                value={budget}
                onChange={setBudget}
                maxLength={40}
                placeholder="$25"
              />
              {kind === "draw" && (
                <Input
                  label="Draw names by (optional)"
                  type="date"
                  value={drawBy}
                  onChange={setDrawBy}
                  hint="Guests see this, so they know when to join by."
                />
              )}
            </div>
            {kind === "everyone" && (
              <p className="text-sm text-tertiary">
                Each list hides what&apos;s been reserved from its owner, and shows it to them the day after the
                event, so they know who to thank.
              </p>
            )}
            {kind === "draw" && (
              <Checkbox
                isSelected={mailed}
                onChange={setMailed}
                label={<span className="font-normal">There&apos;s no get-together: gifts are mailed</span>}
                hint="Guests answer “I'm in” instead of RSVPing, and give a shipping address that only the person who draws them sees."
              />
            )}
          </>
        )}
      </Section>

      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}

      {/* On phones the buttons stay in a bar at the bottom of the screen,
          so saving doesn't mean scrolling past every section first. */}
      <div className="flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:flex-nowrap max-sm:border-t max-sm:border-secondary max-sm:bg-primary max-sm:px-4 max-sm:pt-3 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-sm:*:flex-1">
        <Button type="submit" disabled={saving}>
          <span className="inline-flex items-center gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : editing ? "Save changes" : "Create event"}
          </span>
        </Button>
        <Button variant="outline" asChild>
          <Link href={eventId ? `/dashboard/events/${eventId}` : "/dashboard/events"}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
