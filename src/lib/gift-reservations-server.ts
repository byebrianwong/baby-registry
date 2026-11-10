// Server-only: emails about a guest's gift, and the daily job that reminds
// guests about open reservations and releases the ones that ran out. Every
// query here is filtered by a purchase id, or by reservation status for the
// daily job. See src/lib/gifts.ts for how reservations work.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildBuyerRegistryUrl } from "@/lib/buyer-link";
import { GIFT_HOLD_DAYS, giftLinkUrl } from "@/lib/gifts";
import { classifyStoreLink } from "@/lib/retailers";
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

const DAY_MS = 24 * 60 * 60 * 1000;

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
    .select("id, title, external_url, price")
    .eq("id", purchase.registry_item_id)
    .single();
  if (!item) return null;

  const registry = await getRegistryInfoForBuyer({ itemId: item.id });
  if (!registry) return null;

  const links = {
    confirmUrl: giftLinkUrl({ siteUrl: siteUrl(), slug: registry.slug, purchaseId, step: "confirm" }),
    releaseUrl: giftLinkUrl({ siteUrl: siteUrl(), slug: registry.slug, purchaseId, step: "release" }),
    registryUrl: purchase.buyer_email
      ? buildBuyerRegistryUrl({ siteUrl: siteUrl(), slug: registry.slug, buyerEmail: purchase.buyer_email })
      : `${siteUrl()}/r/${registry.slug}`,
  };
  return { purchase, item, registry, links };
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
    shippingAddress: registry.shippingAddress,
    shopUrl: item.external_url || undefined,
    storeName: storeNameFor(item.external_url),
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
 * Which reminder an open reservation is due, if any: the first when 4 or fewer
 * days are left (day 3 of 7), the last when a day or less is left.
 */
export function reminderDue(
  reservedUntil: string,
  remindersSent: number,
  now: Date
): { send: 1 | 2; daysLeft: number } | null {
  const msLeft = new Date(reservedUntil).getTime() - now.getTime();
  if (msLeft <= 0) return null;
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  if (daysLeft <= 1 && remindersSent < 2) return { send: 2, daysLeft };
  if (daysLeft <= 4 && remindersSent < 1) return { send: 1, daysLeft };
  return null;
}

/**
 * Run once a day by /api/cron/gift-reservations. Releases reservations that ran
 * out and emails their guests, then sends reminders for the ones still open.
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
    const gift = await loadGift(purchaseId);
    if (!gift?.purchase.buyer_email) continue;
    await notifyItemReservationEnded({
      buyerEmail: gift.purchase.buyer_email,
      buyerName: gift.purchase.buyer_name,
      itemTitle: gift.item.title,
      registryTitle: gift.registry.registryTitle,
      registryUrl: `${siteUrl()}/r/${gift.registry.slug}`,
    });
  }

  const { data: open, error: openError } = await supabaseAdmin
    .from("purchases")
    .select("id, reserved_until, reminders_sent")
    .eq("status", "reserved")
    .not("reserved_until", "is", null)
    .not("registry_item_id", "is", null)
    .lt("reminders_sent", 2)
    .gt("reserved_until", now.toISOString())
    .lte("reserved_until", new Date(now.getTime() + 4 * DAY_MS).toISOString());
  if (openError) throw openError;

  for (const row of open ?? []) {
    const due = reminderDue(row.reserved_until as string, row.reminders_sent ?? 0, now);
    if (!due) continue;

    // Claim the reminder before sending, so two runs can't both send it.
    const { data: claimed } = await supabaseAdmin
      .from("purchases")
      .update({ reminders_sent: due.send })
      .eq("id", row.id)
      .eq("status", "reserved")
      .eq("reminders_sent", row.reminders_sent ?? 0)
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
      daysLeft: due.daysLeft,
      shippingAddress: gift.registry.shippingAddress,
      shopUrl: gift.item.external_url || undefined,
      storeName: storeNameFor(gift.item.external_url),
      confirmUrl: gift.links.confirmUrl,
      releaseUrl: gift.links.releaseUrl,
    });
    reminded++;
  }

  return { released, reminded };
}
