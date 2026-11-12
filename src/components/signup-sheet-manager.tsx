"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ClipboardList, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  addSignupRows,
  deleteSignupSheet,
  removeSignupClaim,
  removeSignupRow,
  startSignupSheet,
  updateSignupRow,
  updateSignupSheet,
} from "@/lib/actions/signups";
import {
  MAX_SIGNUP_DAYS,
  MAX_SIGNUP_LABEL_LENGTH,
  MAX_SIGNUP_NEEDED,
  MAX_SIGNUP_NOTE_LENGTH,
  MAX_SIGNUP_TITLE_LENGTH,
  SIGNUP_PRESETS,
  formatSlotDate,
  rowsForDays,
  type HostSignupRow,
  type NewSignupRow,
  type SignupPreset,
} from "@/lib/signups";
import { cx } from "@/lib/utils/cx";

type ActionResult = { error: string | null };

export interface SignupActions {
  start: (eventId: string, preset: SignupPreset) => Promise<ActionResult>;
  updateSheet: (eventId: string, changes: { title: string; note: string }) => Promise<ActionResult>;
  deleteSheet: (eventId: string) => Promise<ActionResult>;
  addRows: (eventId: string, rows: NewSignupRow[]) => Promise<ActionResult & { added?: number }>;
  updateRow: (
    eventId: string,
    itemId: string,
    changes: { label: string; needed: number; slot_date: string | null },
  ) => Promise<ActionResult>;
  removeRow: (eventId: string, itemId: string) => Promise<ActionResult>;
  removeClaim: (eventId: string, itemId: string, guestId: string) => Promise<ActionResult>;
}

const DEFAULT_ACTIONS: SignupActions = {
  start: startSignupSheet,
  updateSheet: updateSignupSheet,
  deleteSheet: deleteSignupSheet,
  addRows: addSignupRows,
  updateRow: updateSignupRow,
  removeRow: removeSignupRow,
  removeClaim: removeSignupClaim,
};

function rowName(row: Pick<HostSignupRow, "label" | "slotDate">) {
  return row.slotDate ? `${formatSlotDate(row.slotDate)}: ${row.label}` : row.label;
}

// ── Turning it on ────────────────────────────────────────────

/** For an event with no sign-up sheet: pick what it's for, and it starts with those rows. */
export function SignupSheetStarter({
  eventId,
  actions: overrides,
}: {
  eventId: string;
  actions?: Partial<Pick<SignupActions, "start">>;
}) {
  const router = useRouter();
  const start = overrides?.start ?? DEFAULT_ACTIONS.start;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<SignupPreset | null>(null);

  const choose = async (preset: SignupPreset) => {
    setBusy(preset);
    const result = await start(eventId, preset);
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunshine-50">
            <ClipboardList aria-hidden="true" className="size-4.5 text-sunshine-900" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-medium text-primary">Sign-up sheet</p>
            <p className="text-sm text-tertiary">
              Ask guests to bring a dish, pick a day to drop off a meal, or help set up. They sign up when they RSVP.
            </p>
            {open ? (
              <div className="mt-2 flex flex-col gap-2">
                {(Object.keys(SIGNUP_PRESETS) as SignupPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => choose(preset)}
                    className="flex cursor-pointer flex-col items-start rounded-xl border border-secondary px-3 py-2 text-left hover:border-primary disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                      {busy === preset && <Loader2 className="size-3.5 animate-spin" />}
                      {SIGNUP_PRESETS[preset].label}
                    </span>
                    <span className="text-xs text-tertiary">{SIGNUP_PRESETS[preset].hint}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="self-start text-sm font-medium text-brand-600 hover:underline max-sm:min-h-11"
              >
                Add a sign-up sheet
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Managing it ──────────────────────────────────────────────

export interface SignupSheetManagerProps {
  eventId: string;
  sheet: { title: string; note: string | null };
  rows: HostSignupRow[];
  /** A meal train: rows are days, and the address shows only to people who sign up. */
  mealTrain?: boolean;
  actions?: Partial<SignupActions>;
}

/**
 * The host's side of a sign-up sheet: the rows, who took each spot and what
 * they're bringing, and adding, changing or removing rows. Guests sign up
 * from their RSVP.
 */
export function SignupSheetManager({ eventId, sheet, rows, mealTrain = false, actions: overrides }: SignupSheetManagerProps) {
  const router = useRouter();
  const actions = { ...DEFAULT_ACTIONS, ...overrides };
  const [editingSheet, setEditingSheet] = useState(false);
  const [title, setTitle] = useState(sheet.title);
  const [note, setNote] = useState(sheet.note ?? "");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [adding, setAdding] = useState<"row" | "days" | null>(rows.length === 0 ? (mealTrain ? "days" : "row") : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const spots = rows.reduce((sum, row) => sum + row.needed, 0);
  const taken = rows.reduce((sum, row) => sum + Math.min(row.claims.length, row.needed), 0);

  const run = async (work: () => Promise<ActionResult>, success?: string) => {
    setBusy(true);
    setError("");
    const result = await work();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    if (success) toast.success(success);
    router.refresh();
    return true;
  };

  const saveSheet = async () => {
    if (await run(() => actions.updateSheet(eventId, { title, note }))) setEditingSheet(false);
  };

  const removeSheet = async () => {
    const claimed = rows.reduce((sum, row) => sum + row.claims.length, 0);
    const warning = claimed
      ? `Remove the sign-up sheet? ${claimed === 1 ? "1 person has" : `${claimed} people have`} signed up. Their sign-ups go too, and they aren't told.`
      : "Remove the sign-up sheet?";
    if (!window.confirm(warning)) return;
    await run(() => actions.deleteSheet(eventId), "Sign-up sheet removed");
  };

  const removeRow = async (row: HostSignupRow) => {
    if (row.claims.length > 0) {
      const names = row.claims.map((c) => c.name).join(", ");
      if (!window.confirm(`Remove "${rowName(row)}"? ${names} signed up for it. They aren't told.`)) return;
    }
    await run(() => actions.removeRow(eventId, row.id));
  };

  const removeClaim = async (row: HostSignupRow, guestId: string, name: string) => {
    if (!window.confirm(`Take ${name} off "${rowName(row)}"? They aren't told.`)) return;
    await run(() => actions.removeClaim(eventId, row.id, guestId));
  };

  return (
    <section aria-labelledby="signup-manager-heading" className="flex flex-col gap-4 rounded-2xl bg-sunshine-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
            <ClipboardList aria-hidden="true" className="size-4.5 text-sunshine-900" />
          </span>
          <div className="min-w-0">
            <h2 id="signup-manager-heading" className="text-lg font-semibold text-primary">
              {sheet.title}
            </h2>
            <p className="text-sm text-tertiary">
              {rows.length === 0
                ? mealTrain
                  ? "Add the days you need meals."
                  : "Add what you'd like people to bring or do."
                : `${taken} of ${spots} ${spots === 1 ? "spot" : "spots"} taken`}
              {mealTrain && " · The address shows only to people who sign up."}
            </p>
          </div>
        </div>
        {!editingSheet && (
          <Button variant="outline" size="sm" onClick={() => setEditingSheet(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Pencil className="size-3.5" />
              Edit
            </span>
          </Button>
        )}
      </div>

      {editingSheet ? (
        <div className="flex flex-col gap-3 rounded-xl bg-primary p-4">
          <Input label="Name" value={title} onChange={setTitle} maxLength={MAX_SIGNUP_TITLE_LENGTH} isRequired />
          <TextArea
            label="Note to guests (optional)"
            value={note}
            onChange={setNote}
            rows={2}
            maxLength={MAX_SIGNUP_NOTE_LENGTH}
            placeholder="Label your dish so people know what's in it."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={saveSheet} disabled={busy}>
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTitle(sheet.title);
                setNote(sheet.note ?? "");
                setEditingSheet(false);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="ghost" className="ml-auto text-error-primary" onClick={removeSheet} disabled={busy}>
              <span className="inline-flex items-center gap-1.5">
                <Trash2 className="size-4" />
                Remove sheet
              </span>
            </Button>
          </div>
        </div>
      ) : (
        sheet.note && <p className="text-sm whitespace-pre-line text-secondary">{sheet.note}</p>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-secondary rounded-xl bg-primary">
          {rows.map((row) =>
            editingRow === row.id ? (
              <li key={row.id} className="p-3">
                <RowForm
                  initial={row}
                  submitLabel="Save"
                  busy={busy}
                  onCancel={() => setEditingRow(null)}
                  onSubmit={async (changes) => {
                    if (await run(() => actions.updateRow(eventId, row.id, changes))) setEditingRow(null);
                  }}
                />
              </li>
            ) : (
              <li key={row.id} className="flex flex-col gap-1.5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{rowName(row)}</p>
                    <p className={cx("text-sm", row.claims.length >= row.needed ? "text-mint-800" : "text-tertiary")}>
                      {row.claims.length >= row.needed
                        ? "Full"
                        : `${row.claims.length} of ${row.needed} taken`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${rowName(row)}`}
                      onClick={() => setEditingRow(row.id)}
                      disabled={busy}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${rowName(row)}`}
                      onClick={() => removeRow(row)}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {row.claims.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {row.claims.map((claim) => (
                      <li key={claim.guestId} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 text-secondary">
                          <span className="font-medium text-primary">{claim.name}</span>
                          {claim.note && <span> · {claim.note}</span>}
                        </span>
                        <button
                          type="button"
                          aria-label={`Take ${claim.name} off ${rowName(row)}`}
                          onClick={() => removeClaim(row, claim.guestId, claim.name)}
                          disabled={busy}
                          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-quaternary hover:bg-secondary hover:text-primary"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {adding === "row" && (
        <div className="rounded-xl bg-primary p-4">
          <RowForm
            submitLabel="Add"
            busy={busy}
            mealTrain={mealTrain}
            onCancel={rows.length > 0 ? () => setAdding(null) : undefined}
            onSubmit={async (row) => {
              await run(() => actions.addRows(eventId, [row]));
            }}
          />
        </div>
      )}
      {adding === "days" && (
        <div className="rounded-xl bg-primary p-4">
          <DaysForm
            busy={busy}
            mealTrain={mealTrain}
            onCancel={rows.length > 0 ? () => setAdding(null) : undefined}
            onSubmit={async (newRows) => {
              if (await run(() => actions.addRows(eventId, newRows))) setAdding(null);
            }}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {adding !== "row" && (
          <Button variant="outline" size="sm" onClick={() => setAdding("row")}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" />
              Add a row
            </span>
          </Button>
        )}
        {adding !== "days" && (
          <Button variant="outline" size="sm" onClick={() => setAdding("days")}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarPlus className="size-4" />
              Add a row for each day
            </span>
          </Button>
        )}
      </div>
    </section>
  );
}

function RowForm({
  initial,
  submitLabel,
  busy,
  mealTrain = false,
  onSubmit,
  onCancel,
}: {
  initial?: Pick<HostSignupRow, "label" | "needed" | "slotDate">;
  submitLabel: string;
  busy: boolean;
  mealTrain?: boolean;
  onSubmit: (row: { label: string; needed: number; slot_date: string | null }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [needed, setNeeded] = useState(String(initial?.needed ?? 1));
  const [date, setDate] = useState(initial?.slotDate ?? "");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ label, needed: Number(needed), slot_date: date || null });
    if (!initial) {
      setLabel("");
      setNeeded("1");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem]">
        <Input
          label="What"
          value={label}
          onChange={setLabel}
          maxLength={MAX_SIGNUP_LABEL_LENGTH}
          placeholder={mealTrain ? "Dinner" : "Sides"}
          isRequired
        />
        <Input
          label="How many"
          type="number"
          value={needed}
          onChange={setNeeded}
          inputMode="numeric"
          min={1}
          max={MAX_SIGNUP_NEEDED}
          isRequired
        />
        <Input label="Day (optional)" type="date" value={date} onChange={setDate} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function DaysForm({
  busy,
  mealTrain,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  mealTrain: boolean;
  onSubmit: (rows: NewSignupRow[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState(mealTrain ? "Dinner" : "");
  const [needed, setNeeded] = useState("1");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!label.trim()) {
      setError("Say what each day needs, like \"Dinner\".");
      return;
    }
    const rows = rowsForDays(from, to || from, label.trim(), Number(needed) || 1);
    if (!rows) {
      setError(`Pick a first and last day, up to ${MAX_SIGNUP_DAYS} days apart.`);
      return;
    }
    setError("");
    await onSubmit(rows);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="First day" type="date" value={from} onChange={setFrom} isRequired />
        <Input label="Last day" type="date" value={to} onChange={setTo} hint="Leave empty for one day." />
        <Input
          label="Each day needs"
          value={label}
          onChange={setLabel}
          maxLength={MAX_SIGNUP_LABEL_LENGTH}
          placeholder="Dinner"
          isRequired
        />
        <Input
          label="People each day"
          type="number"
          value={needed}
          onChange={setNeeded}
          inputMode="numeric"
          min={1}
          max={MAX_SIGNUP_NEEDED}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          Add days
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
