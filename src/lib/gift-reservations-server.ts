// Server-only: emails about a guest's gift, and the daily job that reminds
// guests about open reservations and releases the ones that ran out. Every
// query here is filtered by a purchase id or item id, or by reservation status
// for the daily job. See src/lib/gifts.ts for how reservations work.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildBuyerRegistryUrl } from "@/lib/buyer-link";
import { GIFT_HOLD_DAYS, giftLinkUrl } from "@/lib/gifts";
import { classifyStoreLink, parseRetailerRegistries, registryStoreFor } from "@/lib/retailers";
import { welcomeBoxUnlockedBy } from "@/lib/store-perks-server";
import {
  confirmItemCovered,
  confirmItemGiven,
  confirmItemReserved,
  getRegistryInfoForBuyer,
  notifyItemCovered,
  notifyItemGiven,
  notifyItemReservationEnded,
  remindItemReservation,
} from "@/lib/email";

const HOUR_MS = 60 * 60 * 1000;

/**
 * The daily job sends the one reminder on its first run with this many hours
 * or fewer left. With a 2-day hold and a run every 24 hours, that lands 12 to
 * 36 hours before the reservation ends.
 */
const REMIND_WITHIN_HOURS = 36;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/** "Amazon" for a known store, else the link's host, like "etsy.com". */
function storeNameFor(url: string | null): string | undefined {
  if (!url) return undefined;
  const known = classifyStoreLink(url)?.store.name;
  if (known) return known;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

async function loadGift(purchaseId: string) {
  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("id, registry_item_id, buyer_name, buyer_email, quantity, message, status, reserved_until, reminders_sent")
    .eq("id", purchaseId)
    .single();
  if (!purchase?.registry_item_id) return null;

  const { data: item } = await supabaseAdmin
    .from("registry_items")
    .select("id, title, external_url, registry_id, price")
    .eq("id", purchase.registry_item_id)
    .single();
  if (!item) return null;

  const [registry, { data: settingsRow }] = await Promise.all([
    getRegistryInfoForBuyer({ itemId: item.id }),
    supabaseAdmin.from("registries").select("registry_type, settings").eq("id", item.registry_id).single(),
  ]);
  if (!registry) return null;

  // An item on the owners' own store registry: the store has their address,
  // so the emails leave it out and point to the store. Baby registries only,
  // as on the registry page.
  const registryStoreName =
    settingsRow?.registry_type === "baby"
      ? registryStoreFor(
          item.external_url,
          parseRetailerRegistries(settingsRow.settings).map((r) => r.store)
        )?.name
      : undefined;

  const links = {
    confirmUrl: giftLinkUrl({ siteUrl: siteUrl(), slug: registry.slug, purchaseId, step: "confirm" }),
    releaseUrl: giftLinkUrl({ siteUrl: siteUrl(), slug: registry.slug, purchaseId, step: "release" }),
    registryUrl: purchase.buyer_email
      ? buildBuyerRegistryUrl({ siteUrl: siteUrl(), slug: registry.slug, buyerEmail: purchase.buyer_email })
      : `${siteUrl()}/r/${registry.slug}`,
  };
  return {
    purchase,
    item,
    registry,
    links,
    registryStoreName,
    storeName: registryStoreName || storeNameFor(item.external_url),
  };
}

/** Sent right after a guest reserves an item. */
export async function sendReservationEmail(purchaseId: string) {
  const gift = await loadGift(purchaseId);
  if (!gift?.purchase.buyer_email) return;
  const { purchase, item, registry, links } = gift;

  await confirmItemReserved({
    buyerEmail: purchase.buyer_email,
    buyerName: purchase.buyer_name,
    itemTitle: item.title,
    quantity: purchase.quantity,
    parentName: registry.parentName,
    registryTitle: registry.registryTitle,
    holdDays: GIFT_HOLD_DAYS,
    shippingAddress: gift.registryStoreName ? undefined : registry.shippingAddress,
    registryStoreName: gift.registryStoreName,
    shopUrl: item.external_url || undefined,
    storeName: gift.storeName,
    confirmUrl: links.confirmUrl,
    releaseUrl: links.releaseUrl,
  });
}

/** Sent once a guest says they bought the item: to the owners, and to the guest. */
export async function sendGiftConfirmedEmails(purchaseId: string) {
  const gift = await loadGift(purchaseId);
  if (!gift) return;
  const { purchase, item, registry, links } = gift;

  // A first gift from a store registry can unlock that store's welcome box.
  const welcomeBox = await welcomeBoxUnlockedBy(item.id).catch((err) => {
    console.error("[perks] Failed to check welcome box:", err);
    return null;
  });

  await Promise.all([
    notifyItemGiven({
      itemId: item.id,
      itemTitle: item.title,
      buyerName: purchase.buyer_name,
      quantity: purchase.quantity,
      message: purchase.message,
      welcomeBox,
    }),
    purchase.buyer_email
      ? confirmItemGiven({
          buyerEmail: purchase.buyer_email,
          buyerName: purchase.buyer_name,
          itemTitle: item.title,
          quantity: purchase.quantity,
          parentName: registry.parentName,
          registryTitle: registry.registryTitle,
          registryUrl: links.registryUrl,
          undoUrl: links.releaseUrl,
        })
      : Promise.resolve(),
  ]);
}

/** Tells a guest their reservation ran out and the item went back on the list. */
async function sendReservationEndedEmail(purchaseId: string) {
  const gift = await loadGift(purchaseId);
  if (!gift?.purchase.buyer_email) return;
  await notifyItemReservationEnded({
    buyerEmail: gift.purchase.buyer_email,
    buyerName: gift.purchase.buyer_name,
    itemTitle: gift.item.title,
    registryTitle: gift.registry.registryTitle,
    registryUrl: `${siteUrl()}/r/${gift.registry.slug}`,
  });
}

/**
 * Sent when a guest sends the owners money for an item they bought
 * themselves: to the owners, and to the guest with a link to undo it.
 */
export async function sendCoverGiftEmails(purchaseId: string) {
  const gift = await loadGift(purchaseId);
  if (!gift) return;
  const { purchase, item, registry, links } = gift;
  const amount = item.price != null ? Number(item.price) * purchase.quantity : null;

  await Promise.all([
    notifyItemCovered({
      itemId: item.id,
      itemTitle: item.title,
      buyerName: purchase.buyer_name,
      quantity: purchase.quantity,
      amount,
      message: purchase.message,
    }),
    purchase.buyer_email
      ? confirmItemCovered({
          buyerEmail: purchase.buyer_email,
          buyerName: purchase.buyer_name,
          itemTitle: item.title,
          quantity: purchase.quantity,
          amount,
          parentName: registry.parentName,
          registryTitle: registry.registryTitle,
          registryUrl: links.registryUrl,
          undoUrl: links.releaseUrl,
        })
      : Promise.resolve(),
  ]);
}

/**
 * Releases reservations on one item whose time ran out, so another guest can
 * reserve it without waiting for the daily job. Returns the released purchase
 * ids, whose guests still need the "ended" email.
 */
export async function releaseExpiredOnItem(itemId: string): Promise<string[]> {
  const { data: expired } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("registry_item_id", itemId)
    .eq("status", "reserved")
    .not("reserved_until", "is", null)
    .lte("reserved_until", new Date().toISOString());

  const released: string[] = [];
  for (const row of expired ?? []) {
    const { data: changed, error } = await supabaseAdmin.rpc("release_registry_gift", {
      p_purchase_id: row.id,
    });
    if (error) console.error("[gifts] Failed to release an expired reservation:", error);
    else if (changed) released.push(row.id);
  }
  return released;
}

/** Emails the guests whose reservations releaseExpiredOnItem released. */
export async function sendReservationEndedEmails(purchaseIds: string[]) {
  for (const id of purchaseIds) await sendReservationEndedEmail(id);
}

/** Hours left, rounded, when the one reminder is due; otherwise null. */
export function reminderDue(reservedUntil: string, remindersSent: number, now: Date): number | null {
  const msLeft = new Date(reservedUntil).getTime() - now.getTime();
  if (msLeft <= 0 || remindersSent > 0) return null;
  if (msLeft > REMIND_WITHIN_HOURS * HOUR_MS) return null;
  return Math.max(1, Math.round(msLeft / HOUR_MS));
}

/**
 * Run once a day by /api/cron/gift-reservations. Releases reservations that ran
 * out and emails their guests, then sends a reminder for the ones ending soon.
 */
export async function processGiftReservations(now = new Date()) {
  let released = 0;
  let reminded = 0;

  const { data: releasedIds, error: releaseError } = await supabaseAdmin.rpc(
    "release_expired_registry_gifts"
  );
  if (releaseError) throw releaseError;

  for (const purchaseId of (releasedIds ?? []) as string[]) {
    released++;
    await sendReservationEndedEmail(purchaseId);
  }

  const { data: open, error: openError } = await supabaseAdmin
    .from("purchases")
    .select("id, reserved_until, reminders_sent")
    .eq("status", "reserved")
    .not("reserved_until", "is", null)
    .not("registry_item_id", "is", null)
    .eq("reminders_sent", 0)
    .gt("reserved_until", now.toISOString())
    .lte("reserved_until", new Date(now.getTime() + REMIND_WITHIN_HOURS * HOUR_MS).toISOString());
  if (openError) throw openError;

  for (const row of open ?? []) {
    const hoursLeft = reminderDue(row.reserved_until as string, row.reminders_sent ?? 0, now);
    if (hoursLeft === null) continue;

    // Claim the reminder before sending, so two runs can't both send it.
    const { data: claimed } = await supabaseAdmin
      .from("purchases")
      .update({ reminders_sent: 1 })
      .eq("id", row.id)
      .eq("status", "reserved")
      .eq("reminders_sent", 0)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const gift = await loadGift(row.id);
    if (!gift?.purchase.buyer_email) continue;
    await remindItemReservation({
      buyerEmail: gift.purchase.buyer_email,
      buyerName: gift.purchase.buyer_name,
      itemTitle: gift.item.title,
      parentName: gift.registry.parentName,
      registryTitle: gift.registry.registryTitle,
      hoursLeft,
      shippingAddress: gift.registryStoreName ? undefined : gift.registry.shippingAddress,
      registryStoreName: gift.registryStoreName,
      shopUrl: gift.item.external_url || undefined,
      storeName: gift.storeName,
      confirmUrl: gift.links.confirmUrl,
      releaseUrl: gift.links.releaseUrl,
    });
    reminded++;
  }

  return { released, reminded };
}
