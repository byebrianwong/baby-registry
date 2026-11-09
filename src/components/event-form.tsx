"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { createEvent, setEventImage, updateEvent } from "@/lib/actions/events";
import { uploadEventImage } from "@/lib/upload-event-image";
import type { PhotoUploadResult } from "@/lib/upload-registry-photo";
import {
  COMMON_TIME_ZONES,
  EVENT_TYPE_OPTIONS,
  MAX_PARTY_SIZE_LIMIT,
  type EventDetails,
  type EventType,
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
>;

type ActionResult = { error: string | null };

export interface EventFormProps {
  /** The event being edited. Without it, the form makes a new one. */
  eventId?: string;
  initial?: Partial<Values>;
  /** Registries the person manages, to link the event to. */
  registries: { id: string; title: string }[];
  /** Only the event's owner can change the registry link. */
  canChangeRegistry?: boolean;
  createAction?: (formData: FormData) => Promise<ActionResult & { id?: string }>;
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
  canChangeRegistry = true,
  createAction = createEvent,
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
  const [registryId, setRegistryId] = useState(initial.registry_id ?? "");

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
    data.set("registryId", registryId);
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
              onClick={() => setEventType(option.value)}
              className={cx(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
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
          isSelected={emailHost}
          onChange={setEmailHost}
          label={<span className="font-normal">Email me when someone RSVPs</span>}
        />
      </Section>

      <Section title="Gift registry" description="The event page links guests to it.">
        {registries.length > 0 ? (
          <NativeSelect
            aria-label="Gift registry"
            value={registryId}
            disabled={!canChangeRegistry}
            onChange={(e) => setRegistryId(e.target.value)}
            options={[{ value: "", label: "No registry" }, ...registries.map((r) => ({ value: r.id, label: r.title }))]}
            hint={canChangeRegistry ? undefined : "Only the person who made this event can change its registry."}
          />
        ) : (
          <p className="text-sm text-tertiary">
            You don&apos;t have a registry yet.{" "}
            <Link href="/dashboard/registry/new" className="font-medium text-brand-600 hover:underline">
              Create one
            </Link>{" "}
            and link it here later.
          </p>
        )}
      </Section>

      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
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
