// Server-only perk checks that read across registries with the service-role
// client. Each one is scoped to a registry id it was given or found.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyCompletionDiscounts } from "@/lib/email";
import { getStore, parseRetailerRegistries, registryStoreFor } from "@/lib/retailers";
import { isOpenReservation } from "@/lib/gifts";
import {
  addDays,
  buildStorePerks,
  isCompletionDiscountOpen,
  parseStorePerksState,
  perkStores,
  STORE_PERKS,
  storePerksSettings,
  type PerkItem,
} from "@/lib/store-perks";

export interface UnlockedWelcomeBox {
  storeName: string;
  boxName: string;
}

/**
 * Called after a guest says they bought an item. If that's the first gift from
 * a store registry whose welcome box needs a gift, returns the box so the
 * owner's email can mention it. Reservations still waiting to be bought don't
 * count yet. Returns null when the owner turned perk emails off.
 */
export async function welcomeBoxUnlockedBy(itemId: string): Promise<UnlockedWelcomeBox | null> {
  const { data: item } = await supabaseAdmin
    .from("registry_items")
    .select("registry_id")
    .eq("id", itemId)
    .single();
  if (!item) return null;

  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("registry_type, event_date, settings")
    .eq("id", item.registry_id)
    .single();
  if (!registry || registry.registry_type !== "baby") return null;

  const state = parseStorePerksState(registry.settings);
  if (!state.emails) return null;

  const { data: items } = await supabaseAdmin
    .from("registry_items")
    .select("id, external_url, is_parent_purchased")
    .eq("registry_id", item.registry_id);
  const allItems = (items ?? []) as PerkItem[];
  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("registry_item_id, status, reserved_until")
    .in(
      "registry_item_id",
      allItems.map((i) => i.id)
    );
  const givenPurchases = (purchases ?? []).filter((p) => !isOpenReservation(p));

  const linkedRegistries = parseRetailerRegistries(registry.settings);
  const thisItem = allItems.find((i) => i.id === itemId);
  if (!thisItem || thisItem.is_parent_purchased) return null;
  const store = registryStoreFor(
    thisItem.external_url,
    linkedRegistries.map((r) => r.store)
  );
  if (!store) return null;

  const rows = buildStorePerks({
    items: allItems,
    purchases: givenPurchases,
    linkedRegistries,
    dueDate: registry.event_date,
    today: new Date().toISOString().slice(0, 10),
    state,
  });
  const row = rows.find((r) => r.storeId === store.id);
  // Only the first gift: later ones would repeat the news.
  if (!row?.welcomeBox?.afterGift || row.welcomeBox.status !== "ready" || row.giftCount !== 1) {
    return null;
  }
  return { storeName: row.name, boxName: row.welcomeBox.name };
}

/**
 * Run once a day. Emails each baby registry's managers when a store's
 * completion discount has likely opened, once per store.
 */
export async function sendCompletionDiscountReminders(today: string) {
  const { data: registries } = await supabaseAdmin
    .from("registries")
    .select("id, event_date, settings")
    .eq("registry_type", "baby")
    .not("event_date", "is", null)
    .gte("event_date", addDays(today, -60))
    .lte("event_date", addDays(today, 60));

  let emailed = 0;
  for (const registry of registries ?? []) {
    const state = parseStorePerksState(registry.settings);
    if (!state.emails) continue;
    const dueDate = registry.event_date as string;

    const { data: items } = await supabaseAdmin
      .from("registry_items")
      .select("id, external_url, is_parent_purchased")
      .eq("registry_id", registry.id);
    const stores = perkStores((items ?? []) as PerkItem[], parseRetailerRegistries(registry.settings));
    const due = stores.filter(
      (s) => isCompletionDiscountOpen(s, dueDate, today) && !state.sent.includes(`completion:${s}`)
    );
    if (due.length === 0) continue;

    // Record the reminders before sending, so a second run can't send them
    // again. Re-read settings first so a change the owner just made isn't lost.
    const { data: fresh } = await supabaseAdmin
      .from("registries")
      .select("settings")
      .eq("id", registry.id)
      .single();
    const settings = ((fresh?.settings as Record<string, unknown>) || {}) as Record<string, unknown>;
    const freshState = parseStorePerksState(settings);
    const toSend = due.filter((s) => !freshState.sent.includes(`completion:${s}`));
    if (!freshState.emails || toSend.length === 0) continue;
    freshState.sent = [...freshState.sent, ...toSend.map((s) => `completion:${s}`)];
    settings.store_perks = storePerksSettings(freshState);
    const { error } = await supabaseAdmin
      .from("registries")
      .update({ settings })
      .eq("id", registry.id);
    if (error) {
      console.error("[perks] Failed to record reminders:", error.message);
      continue;
    }

    await notifyCompletionDiscounts({
      registryId: registry.id,
      stores: toSend.map((s) => ({
        name: getStore(s).name,
        amount: STORE_PERKS[s].completionDiscount!.amount,
      })),
    });
    emailed++;
  }

  return { checked: registries?.length ?? 0, emailed };
}
