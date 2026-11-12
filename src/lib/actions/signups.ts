"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/require-account";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getEventForManager, getSignupSheet } from "@/lib/events-server";
import { insertSignupSheet } from "@/lib/signups-server";
import {
  MAX_SIGNUP_NOTE_LENGTH,
  MAX_SIGNUP_ROWS,
  MAX_SIGNUP_TITLE_LENGTH,
  cleanSignupRow,
  isSignupPreset,
  type NewSignupRow,
  type SignupPreset,
} from "@/lib/signups";

// The host's changes to an event's sign-up sheet (#99). Guests' claims go
// through submitRsvp in src/lib/actions/events.ts.

type Result<T = object> = ({ error: null } & T) | { error: string };

async function requireHost(eventId: string) {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." } as const;
  const found = await getEventForManager(eventId, user.id);
  if (!found) return { error: "That event wasn't found, or you can't manage it." } as const;
  return { error: null, user, event: found.event } as const;
}

function revalidate(event: { id: string; slug: string }) {
  revalidatePath(`/dashboard/events/${event.id}`);
  revalidatePath(`/e/${event.slug}`);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

/** Turns the sign-up sheet on, starting from a preset's rows. */
export async function startSignupSheet(eventId: string, preset: SignupPreset): Promise<Result> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  if (!isSignupPreset(preset)) return { error: "Choose what the sheet is for." };
  if (await getSignupSheet(eventId)) return { error: "This event already has a sign-up sheet." };
  const saved = await insertSignupSheet(eventId, preset);
  if (saved.error) return { error: saved.error };
  revalidate(access.event);
  return { error: null };
}

export async function updateSignupSheet(eventId: string, changes: { title: string; note: string }): Promise<Result> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  const title = changes.title.trim().slice(0, MAX_SIGNUP_TITLE_LENGTH);
  if (!title) return { error: "Give the sheet a name, like \"Bring a dish\"." };
  const note = changes.note.trim().slice(0, MAX_SIGNUP_NOTE_LENGTH) || null;
  const { error } = await supabaseAdmin.from("signup_sheets").update({ title, note }).eq("event_id", eventId);
  if (error) return { error: "Your changes weren't saved. Try again." };
  revalidate(access.event);
  return { error: null };
}

/** Turns the sheet off. Its rows and everyone's sign-ups go with it. */
export async function deleteSignupSheet(eventId: string): Promise<Result> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  const { error } = await supabaseAdmin.from("signup_sheets").delete().eq("event_id", eventId);
  if (error) return { error: "The sign-up sheet wasn't removed. Try again." };
  revalidate(access.event);
  return { error: null };
}

/** Adds rows at the end of the sheet. */
export async function addSignupRows(eventId: string, rows: NewSignupRow[]): Promise<Result<{ added: number }>> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  const sheet = await getSignupSheet(eventId);
  if (!sheet) return { error: "Turn on the sign-up sheet first." };
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Add a row." };

  const cleaned: NewSignupRow[] = [];
  for (const row of rows) {
    const result = cleanSignupRow(row);
    if ("error" in result) return { error: result.error };
    cleaned.push(result);
  }
  if (sheet.items.length + cleaned.length > MAX_SIGNUP_ROWS) {
    return { error: `A sign-up sheet can have up to ${MAX_SIGNUP_ROWS} rows.` };
  }
  const start = sheet.items.reduce((max, item) => Math.max(max, item.sort_order + 1), 0);
  const { error } = await supabaseAdmin.from("signup_items").insert(
    cleaned.map((row, index) => ({
      event_id: eventId,
      label: row.label,
      needed: row.needed,
      slot_date: row.slot_date ?? null,
      sort_order: start + index,
    })),
  );
  if (error) {
    console.error("[signups] Failed to add rows:", error);
    return { error: "The rows weren't added. Try again." };
  }
  revalidate(access.event);
  return { error: null, added: cleaned.length };
}

export async function updateSignupRow(
  eventId: string,
  itemId: string,
  changes: { label: string; needed: number; slot_date: string | null },
): Promise<Result> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  if (!isId(itemId)) return { error: "That row wasn't found." };
  const cleaned = cleanSignupRow(changes);
  if ("error" in cleaned) return { error: cleaned.error };

  const sheet = await getSignupSheet(eventId);
  const item = sheet?.items.find((i) => i.id === itemId);
  if (!sheet || !item) return { error: "That row wasn't found." };
  const taken = sheet.claims.filter((c) => c.item_id === itemId).length;
  if (cleaned.needed < taken) {
    return {
      error: `${taken} ${taken === 1 ? "person has" : "people have"} signed up for this already. Remove a sign-up first, or keep at least ${taken}.`,
    };
  }
  const { error } = await supabaseAdmin
    .from("signup_items")
    .update({ label: cleaned.label, needed: cleaned.needed, slot_date: cleaned.slot_date ?? null })
    .eq("id", itemId)
    .eq("event_id", eventId);
  if (error) return { error: "The row wasn't saved. Try again." };
  revalidate(access.event);
  return { error: null };
}

/** Removes a row and the sign-ups on it. */
export async function removeSignupRow(eventId: string, itemId: string): Promise<Result> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  if (!isId(itemId)) return { error: "That row wasn't found." };
  const { error } = await supabaseAdmin.from("signup_items").delete().eq("id", itemId).eq("event_id", eventId);
  if (error) return { error: "The row wasn't removed. Try again." };
  revalidate(access.event);
  return { error: null };
}

/** Takes a guest off a row, freeing the spot. */
export async function removeSignupClaim(eventId: string, itemId: string, guestId: string): Promise<Result> {
  const access = await requireHost(eventId);
  if (access.error !== null) return { error: access.error };
  if (!isId(itemId) || !isId(guestId)) return { error: "That sign-up wasn't found." };
  const { data: item } = await supabaseAdmin
    .from("signup_items")
    .select("id")
    .eq("id", itemId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!item) return { error: "That sign-up wasn't found." };
  const { error } = await supabaseAdmin.from("signup_claims").delete().eq("item_id", itemId).eq("guest_id", guestId);
  if (error) return { error: "The sign-up wasn't removed. Try again." };
  revalidate(access.event);
  return { error: null };
}
