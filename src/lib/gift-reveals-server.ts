import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyGiftsRevealed } from "@/lib/email";
import { hidesReservations } from "@/lib/gifts";
import { addDays, REVEAL_HOUR_UTC, revealMomentFor } from "@/lib/reveal";

// The daily reveal. When a list hides what's been reserved from its owner
// and is linked to an event, its owner sees the gifts reserved before the
// event from the day after it (src/lib/reveal.ts). The database shows them
// as soon as the moment passes (gifts_revealed_through in
// 20261114035445_everyone_gives_everyone.sql). This job logs each reveal in
// gift_reveals, which keeps it in place if the event is later moved or
// unlinked, and sends the owner one "your gifts are revealed" email.
//
// The cron route src/app/api/cron/gift-reservations calls it once a day.

/** How far back the job looks, so a missed day or two still gets its reveal. */
const LOOKBACK_DAYS = 14;

interface RevealedList {
  id: string;
  title: string;
  owner_id: string;
}

/** The lists linked to an event that hide reservations from their owners. */
async function hiddenListsFor(eventId: string): Promise<RevealedList[]> {
  const [{ data: links }, { data: wishlists }] = await Promise.all([
    supabaseAdmin.from("event_registries").select("registry_id").eq("event_id", eventId),
    supabaseAdmin
      .from("event_guests")
      .select("wishlist_registry_id")
      .eq("event_id", eventId)
      .not("wishlist_registry_id", "is", null),
  ]);
  const ids = [
    ...new Set([
      ...(links || []).map((l) => l.registry_id as string),
      ...(wishlists || []).map((w) => w.wishlist_registry_id as string),
    ]),
  ];
  if (ids.length === 0) return [];
  const { data } = await supabaseAdmin.from("registries").select("id, title, owner_id, settings").in("id", ids);
  return (data || [])
    .filter((r) => hidesReservations(r.settings))
    .map((r) => ({ id: r.id as string, title: r.title as string, owner_id: r.owner_id as string }));
}

/** Gifts on a list, not cancelled, reserved before a moment. */
async function giftsBefore(registryId: string, before: string): Promise<number> {
  const [{ count: items }, { count: funds }] = await Promise.all([
    supabaseAdmin
      .from("purchases")
      .select("id, registry_items!registry_item_id!inner(registry_id)", { count: "exact", head: true })
      .eq("registry_items.registry_id", registryId)
      .neq("status", "cancelled")
      .lt("created_at", before),
    supabaseAdmin
      .from("purchases")
      .select("id, cash_funds!cash_fund_id!inner(registry_id)", { count: "exact", head: true })
      .eq("cash_funds.registry_id", registryId)
      .neq("status", "cancelled")
      .lt("created_at", before),
  ]);
  return (items ?? 0) + (funds ?? 0);
}

async function ownerContact(ownerId: string): Promise<{ email: string; name: string } | null> {
  const [{ data: auth }, { data: profile }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(ownerId),
    supabaseAdmin.from("profiles").select("full_name").eq("id", ownerId).maybeSingle(),
  ]);
  const email = auth.user?.email;
  if (!email || auth.user?.is_anonymous) return null;
  const name = (profile?.full_name as string | null)?.trim().split(/\s+/)[0] || "there";
  return { email, name };
}

/**
 * Reveals the hidden gifts of events whose day-after has come, and emails
 * each list's owner once. Returns how many lists were revealed and emailed.
 */
export async function revealGiftsAfterEvents(now = new Date()): Promise<{ revealed: number; emailed: number }> {
  // An event on day D reveals at 12:00 UTC on D + 1. So every event before
  // this date has revealed: the date it is at UTC-12, the last place on
  // earth to reach a new day.
  const lastPlaceToday = new Date(now.getTime() - REVEAL_HOUR_UTC * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, title, event_date")
    .lt("event_date", lastPlaceToday)
    .gte("event_date", addDays(lastPlaceToday, -LOOKBACK_DAYS));
  if (error) {
    console.error("[reveal] Failed to read events:", error);
    return { revealed: 0, emailed: 0 };
  }

  let revealed = 0;
  let emailed = 0;
  for (const event of events || []) {
    const revealedAt = revealMomentFor(event.event_date as string).toISOString();
    for (const list of await hiddenListsFor(event.id as string)) {
      // Claim the reveal first: a list already revealed for this event, by
      // an earlier run, comes back empty and gets no second email.
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("gift_reveals")
        .upsert(
          { event_id: event.id, registry_id: list.id, revealed_at: revealedAt },
          { onConflict: "event_id,registry_id", ignoreDuplicates: true },
        )
        .select("id");
      if (claimError) {
        console.error("[reveal] Failed to log a reveal:", claimError);
        continue;
      }
      if (!claimed || claimed.length === 0) continue;
      revealed++;

      const count = await giftsBefore(list.id, revealedAt);
      if (count === 0) continue;
      const owner = await ownerContact(list.owner_id);
      if (!owner) continue;
      const sent = await notifyGiftsRevealed({
        toEmail: owner.email,
        ownerName: owner.name,
        registryId: list.id,
        registryTitle: list.title,
        eventTitle: event.title as string,
        giftCount: count,
      });
      if (sent) {
        emailed++;
        await supabaseAdmin
          .from("gift_reveals")
          .update({ emailed_at: new Date().toISOString() })
          .eq("id", claimed[0].id);
      }
    }
  }
  return { revealed, emailed };
}
