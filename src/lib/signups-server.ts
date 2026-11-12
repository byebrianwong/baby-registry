import { supabaseAdmin } from "@/lib/supabase-admin";
import { SIGNUP_PRESETS, type NewSignupRow, type SignupPreset } from "@/lib/signups";

// Writes for sign-up sheets that more than one server action needs. Not a
// server action file: callers check that the user can manage the event first.

/**
 * Turns on an event's sign-up sheet from a preset, with the preset's rows and
 * any `extraRows` after them. Does nothing when the event already has a sheet.
 */
export async function insertSignupSheet(
  eventId: string,
  preset: SignupPreset,
  extraRows: NewSignupRow[] = [],
): Promise<{ error: string | null }> {
  const chosen = SIGNUP_PRESETS[preset];
  const { error } = await supabaseAdmin
    .from("signup_sheets")
    .upsert({ event_id: eventId, title: chosen.title, note: chosen.note }, { onConflict: "event_id", ignoreDuplicates: true });
  if (error) {
    console.error("[signups] Failed to start a sheet:", error);
    return { error: "The sign-up sheet wasn't made. Try again." };
  }
  const rows = [...chosen.rows, ...extraRows];
  if (rows.length > 0) {
    const { count } = await supabaseAdmin
      .from("signup_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    // An existing sheet keeps its rows.
    if ((count ?? 0) > 0) return { error: null };
    const { error: rowError } = await supabaseAdmin.from("signup_items").insert(
      rows.map((row, index) => ({
        event_id: eventId,
        label: row.label,
        needed: row.needed,
        slot_date: row.slot_date ?? null,
        sort_order: index,
      })),
    );
    if (rowError) {
      console.error("[signups] Failed to add preset rows:", rowError);
      return { error: "The sign-up sheet's rows weren't added. Add them from the event page." };
    }
  }
  return { error: null };
}

/** Copies a sheet and its rows (not who signed up) to another event, moving dates by `shiftYears`. */
export async function copySignupSheet(fromEventId: string, toEventId: string, shiftYears = 0) {
  const { data: sheet } = await supabaseAdmin.from("signup_sheets").select("title, note").eq("event_id", fromEventId).maybeSingle();
  if (!sheet) return;
  await supabaseAdmin.from("signup_sheets").insert({ event_id: toEventId, title: sheet.title, note: sheet.note });
  const { data: items } = await supabaseAdmin
    .from("signup_items")
    .select("label, slot_date, needed, sort_order")
    .eq("event_id", fromEventId);
  if (!items || items.length === 0) return;
  const shift = (date: string | null) => {
    if (!date || shiftYears === 0) return date;
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCFullYear(next.getUTCFullYear() + shiftYears);
    return next.toISOString().slice(0, 10);
  };
  await supabaseAdmin
    .from("signup_items")
    .insert(items.map((item) => ({ ...item, slot_date: shift(item.slot_date), event_id: toEventId })));
}
