"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Copy, Download, Loader2, Mail, Pencil, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addEventGuests,
  removeEventGuest,
  sendEventInvites,
  sendEventReminders,
  setGuestRsvp,
  updateEventGuest,
} from "@/lib/actions/events";
import {
  isEmail,
  parseGuestList,
  RSVP_LABELS,
  summarizeRsvps,
  type EventGuest,
  type ParsedGuest,
  type RsvpStatus,
} from "@/lib/events";
import { initialsFor } from "@/lib/initials";
import { cx } from "@/lib/utils/cx";

type ActionResult = { error: string | null };

export interface GuestManagerActions {
  addGuests: (eventId: string, guests: ParsedGuest[]) => Promise<ActionResult & { added?: number; alreadyListed?: number }>;
  sendInvites: (eventId: string, guestIds?: string[]) => Promise<ActionResult & { sent?: number }>;
  sendReminders: (eventId: string) => Promise<ActionResult & { sent?: number }>;
  setRsvp: (eventId: string, guestId: string, status: RsvpStatus, partySize: number) => Promise<ActionResult>;
  updateGuest: (eventId: string, guestId: string, changes: { name: string; email: string | null }) => Promise<ActionResult>;
  removeGuest: (eventId: string, guestId: string) => Promise<ActionResult>;
}

const DEFAULT_ACTIONS: GuestManagerActions = {
  addGuests: addEventGuests,
  sendInvites: sendEventInvites,
  sendReminders: sendEventReminders,
  setRsvp: setGuestRsvp,
  updateGuest: updateEventGuest,
  removeGuest: removeEventGuest,
};

export interface EventGuestManagerProps {
  eventId: string;
  eventSlug: string;
  guests: EventGuest[];
  maxPartySize: number;
  /** Where guests' replies to the email go: the signed-in host's address. */
  replyToEmail: string | null;
  /** The site's address, for copying RSVP links. Stories pass one. */
  origin?: string;
  /** Put in front of the RSVP links' path. The demo passes "/demo". */
  basePath?: string;
  actions?: Partial<GuestManagerActions>;
}

type Filter = "all" | RsvpStatus;

const STATUS_STYLES: Record<RsvpStatus, string> = {
  yes: "bg-mint-100 text-mint-800",
  maybe: "bg-sunshine-100 text-sunshine-900",
  no: "bg-secondary text-tertiary",
  pending: "bg-brand-50 text-brand-700",
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <p className="text-sm text-tertiary">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {detail && <p className="text-xs text-tertiary">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(guests: EventGuest[]) {
  const rows = [
    ["Name", "Email", "RSVP", "People", "Note", "Invited"],
    ...guests.map((g) => [
      g.name,
      g.email,
      RSVP_LABELS[g.rsvp_status],
      g.rsvp_status === "yes" || g.rsvp_status === "maybe" ? g.party_size : "",
      g.rsvp_note,
      g.invited_at ? new Date(g.invited_at).toISOString().slice(0, 10) : "",
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "guest-list.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** The host's guest list: RSVP counts, adding guests, sending invitations and reminders. */
export function EventGuestManager({
  eventId,
  eventSlug,
  guests,
  maxPartySize,
  replyToEmail,
  origin,
  basePath = "",
  actions: actionOverrides,
}: EventGuestManagerProps) {
  const router = useRouter();
  const actions = { ...DEFAULT_ACTIONS, ...actionOverrides };
  const summary = summarizeRsvps(guests);
  const [filter, setFilter] = useState<Filter>("all");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [confirming, setConfirming] = useState<"invite" | "remind" | null>(null);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const now = Date.now();
  // Matches sendEventInvites: guests who already replied, including people
  // who added themselves from the event link, don't need the invitation.
  const uninvited = guests.filter((g) => g.email && !g.invited_at && g.rsvp_status === "pending");
  const remindable = guests.filter(
    (g) =>
      g.email &&
      g.invited_at &&
      g.rsvp_status === "pending" &&
      (!g.reminded_at || now - Date.parse(g.reminded_at) >= 24 * 60 * 60 * 1000),
  );
  const withoutEmail = guests.filter((g) => !g.email).length;
  const shown = filter === "all" ? guests : guests.filter((g) => g.rsvp_status === filter);
  const editingGuest = guests.find((g) => g.id === editingId) ?? null;

  const pastePreview = useMemo(() => parseGuestList(pasted), [pasted]);

  const linkFor = (guest: EventGuest) =>
    `${origin ?? (typeof window !== "undefined" ? window.location.origin : "")}${basePath}/e/${eventSlug}?g=${encodeURIComponent(guest.token)}`;

  const add = async (list: ParsedGuest[]) => {
    setAdding(true);
    setAddError("");
    const result = await actions.addGuests(eventId, list);
    setAdding(false);
    if (result.error) {
      setAddError(result.error);
      return false;
    }
    const added = result.added ?? list.length;
    const skipped = result.alreadyListed ?? 0;
    toast.success(
      `${added === 1 ? "Added 1 guest" : `Added ${added} guests`}${skipped ? `. ${skipped} already on the list.` : ""}`,
    );
    router.refresh();
    return true;
  };

  const handleAddOne = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!name.trim()) {
      setAddError("Add the guest's name.");
      return;
    }
    if (trimmedEmail && !isEmail(trimmedEmail)) {
      setAddError("That email address doesn't look right.");
      return;
    }
    if (await add([{ name: name.trim(), email: trimmedEmail || null }])) {
      setName("");
      setEmail("");
    }
  };

  const handleAddPasted = async () => {
    if (pastePreview.guests.length === 0) {
      setAddError("Paste one guest per line, like: Glinda Upland, glinda@example.com");
      return;
    }
    if (await add(pastePreview.guests)) {
      setPasted("");
      setPasting(false);
    }
  };

  const send = async (kind: "invite" | "remind") => {
    setSending(true);
    const result = kind === "invite" ? await actions.sendInvites(eventId) : await actions.sendReminders(eventId);
    setSending(false);
    setConfirming(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      const sent = result.sent ?? 0;
      toast.success(
        kind === "invite"
          ? `Sent ${sent === 1 ? "1 invitation" : `${sent} invitations`}`
          : `Sent ${sent === 1 ? "1 reminder" : `${sent} reminders`}`,
      );
    }
    router.refresh();
  };

  const confirmCount = confirming === "invite" ? uninvited.length : remindable.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Going"
          value={summary.attending}
          detail={summary.yes === 1 ? "1 RSVP" : `${summary.yes} RSVPs`}
        />
        <Stat
          label="Maybe"
          value={summary.maybeHeadcount}
          detail={summary.maybe === 1 ? "1 RSVP" : `${summary.maybe} RSVPs`}
        />
        <Stat label="Can't go" value={summary.no} />
        <Stat
          label="No reply"
          value={summary.pending}
          detail={`${summary.invited} of ${summary.guests} invited`}
        />
      </div>

      {/* Sending */}
      {(uninvited.length > 0 || remindable.length > 0) && (
        <div className="rounded-2xl bg-brand-50 p-4">
          {confirming ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-primary">
                  {confirming === "invite"
                    ? `Email the invitation to ${confirmCount === 1 ? "1 guest" : `${confirmCount} guests`} now?`
                    : `Remind ${confirmCount === 1 ? "1 guest who hasn't" : `${confirmCount} guests who haven't`} replied?`}
                </p>
                <p className="text-sm text-tertiary">
                  {replyToEmail
                    ? `If they reply to the email, it goes to ${replyToEmail}.`
                    : "Each guest gets their own RSVP link."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => send(confirming)} disabled={sending}>
                  <span className="inline-flex items-center gap-1.5">
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {sending ? "Sending…" : "Send"}
                  </span>
                </Button>
                <Button variant="outline" onClick={() => setConfirming(null)} disabled={sending}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Mail aria-hidden="true" className="size-4.5 text-brand-600" />
                </span>
                <div>
                  <p className="font-medium text-primary">
                    {uninvited.length > 0
                      ? `${uninvited.length === 1 ? "1 guest hasn't" : `${uninvited.length} guests haven't`} been sent the invitation`
                      : `${remindable.length === 1 ? "1 guest hasn't" : `${remindable.length} guests haven't`} replied yet`}
                  </p>
                  <p className="text-sm text-tertiary">
                    {uninvited.length > 0
                      ? "Each guest gets the invitation by email with their own RSVP link."
                      : "Send a friendly reminder. Each guest gets at most one a day."}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {uninvited.length > 0 && (
                  <Button onClick={() => setConfirming("invite")}>
                    <span className="inline-flex items-center gap-1.5">
                      <Send className="size-4" />
                      Send invitations
                    </span>
                  </Button>
                )}
                {remindable.length > 0 && (
                  <Button variant="outline" onClick={() => setConfirming("remind")}>
                    <span className="inline-flex items-center gap-1.5">
                      <Bell className="size-4" />
                      Remind {remindable.length}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adding */}
      <section aria-labelledby="add-guests-heading" className="rounded-xl border border-secondary p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="add-guests-heading" className="font-semibold text-primary">
            Add guests
          </h2>
          <button
            type="button"
            onClick={() => {
              setPasting(!pasting);
              setAddError("");
            }}
            className="cursor-pointer text-sm font-medium text-brand-600 hover:underline max-sm:-my-3 max-sm:min-h-11"
          >
            {pasting ? "Add one at a time" : "Paste a list"}
          </button>
        </div>
        {pasting ? (
          <div className="mt-3 flex flex-col gap-3">
            <TextArea
              aria-label="Guest list"
              value={pasted}
              onChange={setPasted}
              rows={6}
              autoCorrect="off"
              spellCheck="false"
              placeholder={"Glinda Upland, glinda@example.com\nElphaba Thropp <elphie@example.com>\nNessa Thropp"}
              hint="One guest per line: a name and an email address. Copy them from a spreadsheet or your contacts."
            />
            {pasted.trim() && (
              <p className="text-sm text-tertiary">
                {pastePreview.guests.length === 1 ? "1 guest" : `${pastePreview.guests.length} guests`} ready to add
                {pastePreview.skipped.length > 0 &&
                  `. ${pastePreview.skipped.length === 1 ? "1 line" : `${pastePreview.skipped.length} lines`} couldn't be read: ${pastePreview.skipped.slice(0, 3).join("; ")}`}
              </p>
            )}
            <div>
              <Button onClick={handleAddPasted} disabled={adding}>
                <span className="inline-flex items-center gap-1.5">
                  {adding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Add guests
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAddOne} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* A guest's details, not the owner's, so no autofill. */}
            <Input
              label="Name"
              value={name}
              onChange={setName}
              autoComplete="off"
              enterKeyHint="next"
              className="sm:flex-1"
              maxLength={100}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="off"
              enterKeyHint="done"
              className="sm:flex-1"
            />
            <Button type="submit" disabled={adding} className="h-10">
              <span className="inline-flex items-center gap-1.5">
                {adding ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Add
              </span>
            </Button>
          </form>
        )}
        {addError && (
          <p role="alert" className="mt-2 text-sm text-error-primary">
            {addError}
          </p>
        )}
        {withoutEmail > 0 && (
          <p className="mt-2 text-sm text-tertiary">
            {withoutEmail === 1 ? "1 guest has" : `${withoutEmail} guests have`} no email address. Copy their RSVP link
            from the guest&apos;s Edit button and text it to them.
          </p>
        )}
      </section>

      {/* The list */}
      <section aria-labelledby="guest-list-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="guest-list-heading" className="text-xl font-semibold">
            Guest list
          </h2>
          {guests.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => downloadCsv(guests)}>
              <span className="inline-flex items-center gap-1.5">
                <Download className="size-4" />
                Download CSV
              </span>
            </Button>
          )}
        </div>

        {guests.length > 0 && (
          <div role="group" aria-label="Show" className="mt-3 flex flex-wrap gap-2">
            {(["all", "yes", "maybe", "no", "pending"] as Filter[]).map((value) => {
              const count = value === "all" ? guests.length : summary[value];
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={cx(
                    "cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-600 max-sm:min-h-11",
                    filter === value
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-secondary text-secondary hover:border-primary",
                  )}
                >
                  {value === "all" ? "All" : RSVP_LABELS[value]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {guests.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus aria-hidden="true" className="size-8 text-brand-600" />
              <p className="mt-3 font-medium">No guests yet</p>
              <p className="mt-1 max-w-sm text-sm text-tertiary">
                Add your guests above, then send the invitation. Or share the event link, and guests who RSVP are
                added here.
              </p>
            </CardContent>
          </Card>
        ) : shown.length === 0 ? (
          <p className="mt-4 text-sm text-tertiary">No guests here yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-secondary rounded-xl border border-secondary">
            {shown.map((guest) => (
              <li key={guest.id} className="flex items-start gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary"
                >
                  {initialsFor(guest.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-primary">{guest.name}</span>
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLES[guest.rsvp_status],
                      )}
                    >
                      {RSVP_LABELS[guest.rsvp_status]}
                      {(guest.rsvp_status === "yes" || guest.rsvp_status === "maybe") && guest.party_size > 1
                        ? ` · ${guest.party_size}`
                        : ""}
                    </span>
                  </div>
                  <p className="truncate text-sm text-tertiary">
                    {guest.email ?? "No email"}
                    {" · "}
                    {guest.added_by_guest
                      ? "RSVPed from the event link"
                      : guest.invited_at
                        ? `Invited ${formatShortDate(guest.invited_at)}${guest.reminded_at ? `, reminded ${formatShortDate(guest.reminded_at)}` : ""}`
                        : "Not sent yet"}
                  </p>
                  {guest.rsvp_note && (
                    <p className="mt-1 text-sm whitespace-pre-line text-secondary">“{guest.rsvp_note}”</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${guest.name}`}
                  onClick={() => setEditingId(guest.id)}
                >
                  <Pencil className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingGuest && (
        <GuestDialog
          key={editingGuest.id}
          guest={editingGuest}
          eventId={eventId}
          maxPartySize={maxPartySize}
          rsvpLink={linkFor(editingGuest)}
          actions={actions}
          onClose={() => setEditingId(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function GuestDialog({
  guest,
  eventId,
  maxPartySize,
  rsvpLink,
  actions,
  onClose,
  onSaved,
}: {
  guest: EventGuest;
  eventId: string;
  maxPartySize: number;
  rsvpLink: string;
  actions: GuestManagerActions;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email ?? "");
  const [status, setStatus] = useState<RsvpStatus>(guest.rsvp_status);
  const [partySize, setPartySize] = useState(String(Math.max(guest.party_size, 1)));
  const [busy, setBusy] = useState<"save" | "send" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const detailsChanged = name.trim() !== guest.name || (email.trim().toLowerCase() || null) !== guest.email;
  const rsvpChanged =
    status !== guest.rsvp_status ||
    ((status === "yes" || status === "maybe") && Number(partySize) !== guest.party_size);

  const save = async () => {
    setBusy("save");
    setError("");
    if (detailsChanged) {
      const result = await actions.updateGuest(eventId, guest.id, { name, email: email.trim() || null });
      if (result.error) {
        setError(result.error);
        setBusy(null);
        return;
      }
    }
    if (rsvpChanged) {
      const result = await actions.setRsvp(eventId, guest.id, status, Number(partySize));
      if (result.error) {
        setError(result.error);
        setBusy(null);
        return;
      }
    }
    setBusy(null);
    onSaved();
    onClose();
  };

  const sendInvite = async () => {
    setBusy("send");
    setError("");
    const result = await actions.sendInvites(eventId, [guest.id]);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(`Sent the invitation to ${guest.name}`);
    onSaved();
  };

  const remove = async () => {
    setBusy("remove");
    const result = await actions.removeGuest(eventId, guest.id);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(rsvpLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{guest.name}</DialogTitle>
          <DialogDescription>
            {guest.responded_at
              ? `Replied ${formatShortDate(guest.responded_at)}`
              : guest.invited_at
                ? `Invited ${formatShortDate(guest.invited_at)}, no reply yet`
                : "Not invited yet"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={setName} maxLength={100} />
            <Input label="Email" type="email" value={email} onChange={setEmail} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NativeSelect
              label="RSVP"
              value={status}
              onChange={(e) => setStatus(e.target.value as RsvpStatus)}
              options={(["pending", "yes", "maybe", "no"] as RsvpStatus[]).map((value) => ({
                value,
                label: RSVP_LABELS[value],
              }))}
            />
            {(status === "yes" || status === "maybe") && maxPartySize > 1 && (
              <NativeSelect
                label="People"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                options={Array.from({ length: Math.max(maxPartySize, guest.party_size) }, (_, i) => ({
                  value: String(i + 1),
                  label: String(i + 1),
                }))}
              />
            )}
          </div>
          {guest.rsvp_note && <p className="text-sm text-secondary">Their note: “{guest.rsvp_note}”</p>}

          <div className="rounded-lg bg-secondary p-3">
            <p className="text-sm font-medium text-primary">Their RSVP link</p>
            <p className="mt-0.5 text-xs break-all text-tertiary">{rsvpLink}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <span className="inline-flex items-center gap-1.5">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy link"}
                </span>
              </Button>
              {guest.email && (
                <Button variant="outline" size="sm" onClick={sendInvite} disabled={busy !== null}>
                  <span className="inline-flex items-center gap-1.5">
                    {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {guest.invited_at ? "Send invitation again" : "Send invitation"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-error-primary">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {confirmRemove ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-secondary">Remove {guest.name}?</span>
                <Button variant="destructive" size="sm" onClick={remove} disabled={busy !== null}>
                  {busy === "remove" ? "Removing…" : "Remove"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmRemove(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
                <span className="inline-flex items-center gap-1.5 text-error-primary">
                  <Trash2 className="size-4" />
                  Remove guest
                </span>
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy !== null || (!detailsChanged && !rsvpChanged)}>
                {busy === "save" ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
