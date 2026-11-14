"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";
import { getViewer } from "@/lib/viewer";
import { isUuid } from "@/lib/extension";
import { readEventGuestCookie } from "@/lib/event-guest-cookie";
import { looksLikeEmail, normalizeEmail } from "@/lib/email-address";
import { GIFT_HOLD_DAYS, GROUP_GIFT_HOLD_DAYS } from "@/lib/gifts";
import {
  releaseExpiredOnItem,
  sendGiftConfirmedEmails,
  sendReservationEndedEmails,
} from "@/lib/gift-reservations-server";
import {
  PAYBACK_NOTE_MAX,
  groupGiftPath,
  groupGiftReservationName,
  isGroupGiftToken,
  parseGroupGiftAmount,
} from "@/lib/group-gifts";
import { listsForItems } from "@/lib/list-items";
import {
  findGroupGift,
  managesGroupGiftList,
  newGroupGiftToken,
  rememberPledge,
  rememberedPledgeToken,
  statusOfGroupGift,
  type GroupGiftRow,
} from "@/lib/group-gifts-server";
import {
  sendGroupGiftCalledOffEmails,
  sendGroupGiftStartedEmail,
  sendPledgeEmails,
} from "@/lib/group-gift-email";

// Group gifts (src/lib/group-gifts.ts). The tables are server-only, so every
// change goes through the service-role client after the checks here:
//
// - Starting one needs an account that doesn't manage the list.
// - Chipping in needs the group gift's token, from the link the organizer
//   shared. No account needed.
// - Changing or taking back a pledge needs that pledge's own token, which only
//   its pledger has: in their email, their browser's cookie, or the page when
//   they're signed in as the account that made it.
// - Marking pledges paid, marking the gift bought and calling it off are the
//   organizer's, signed in.

type Result<T = object> = ({ error?: undefined; success: true } & T) | { error: string };

const SOMETHING_WRONG = "Something went wrong. Try again in a moment.";
const NOT_FOUND = "We couldn't find this group gift.";
const ORGANIZER_ONLY = "Only the person who started this group gift can do that.";

function revalidateGift(token: string, slug?: string | null) {
  revalidatePath(groupGiftPath(token));
  if (slug) revalidatePath(`/r/${slug}`);
}

async function slugOf(registryId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("registries").select("slug").eq("id", registryId).maybeSingle();
  return (data?.slug as string | undefined) ?? null;
}

/**
 * The event to record on a new group gift: the one whose invitation the
 * organizer came from (the event guest cookie), when it links this list.
 */
async function eventFromInvitation(registryId: string): Promise<string | null> {
  try {
    const guest = await readEventGuestCookie();
    if (!guest || !isUuid(guest.eventId)) return null;
    const { data } = await supabaseAdmin
      .from("event_registries")
      .select("event_id")
      .eq("event_id", guest.eventId)
      .eq("registry_id", registryId)
      .maybeSingle();
    return data ? guest.eventId : null;
  } catch {
    return null;
  }
}

/**
 * Starts a group gift on an open item. Reserves it in the organizer's name,
 * "Oz and others", held until they buy it, so nobody else buys it. Returns the
 * token for the group gift's page.
 */
export async function startGroupGift(input: {
  /** The list it's started from. The item can be on several of its owner's lists. */
  registryId: string;
  itemId: string;
  goalAmount?: string | number | null;
  paybackNote?: string | null;
}): Promise<Result<{ token: string }>> {
  const { user, supabase, error } = await requireAccount();
  if (error || !user) return { error: "Sign in to start a group gift." };
  if (!isUuid(input.itemId) || !isUuid(input.registryId)) return { error: "This item isn't on the list anymore." };

  const { data: item } = await supabaseAdmin
    .from("registry_items")
    .select("id, registry_id, price, is_parent_purchased")
    .eq("id", input.itemId)
    .maybeSingle();
  const registryId = input.registryId;
  if (!item || !((await listsForItems([item.id])).get(item.id) ?? []).includes(registryId)) {
    return { error: "This item isn't on the list anymore." };
  }
  if (item.is_parent_purchased) return { error: "They already have this one, so it can't be a group gift." };
  if (await managesGroupGiftList(user.id, { registry_id: registryId, item_id: item.id })) {
    return { error: "You can't start a group gift on a list you manage." };
  }

  const goalText = input.goalAmount == null ? "" : String(input.goalAmount).trim();
  const goal = goalText ? parseGroupGiftAmount(goalText) : item.price != null ? parseGroupGiftAmount(Number(item.price)) : null;
  if (goalText && goal === null) return { error: "Enter the total to collect, like 120." };
  const paybackNote = (input.paybackNote ?? "").trim().slice(0, PAYBACK_NOTE_MAX) || null;

  const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  // As in reserveItem: free up reservations on this item that ran out.
  const released = await releaseExpiredOnItem(item.id).catch((err) => {
    console.error("[group gifts] Failed to release expired reservations:", err);
    return [] as string[];
  });
  if (released.length > 0) after(() => sendReservationEndedEmails(released));

  // The same reservation any guest makes, so the owner sees an ordinary one.
  const { data: purchaseId, error: reserveError } = await supabase.rpc("reserve_registry_item", {
    p_item_id: item.id,
    p_quantity: 1,
    p_buyer_name: groupGiftReservationName(profile?.full_name as string | null),
    p_buyer_email: user.email ?? null,
    p_message: null,
    p_hold_days: GIFT_HOLD_DAYS,
  });
  if (reserveError || typeof purchaseId !== "string") {
    if (reserveError?.message.startsWith("Not enough quantity")) {
      return { error: "Someone just reserved this. Pick another gift." };
    }
    console.error("[group gifts] Failed to reserve:", reserveError);
    return { error: "Couldn't reserve it. Try again in a moment." };
  }

  // Held until it's bought rather than for the usual few days.
  const heldUntil = new Date(Date.now() + GROUP_GIFT_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [{ error: holdError }, eventId] = await Promise.all([
    supabaseAdmin.from("purchases").update({ reserved_until: heldUntil }).eq("id", purchaseId),
    eventFromInvitation(registryId),
  ]);

  const token = newGroupGiftToken();
  const { error: saveError } = holdError
    ? { error: holdError }
    : await supabaseAdmin.from("group_gifts").insert({
        token,
        registry_id: registryId,
        item_id: item.id,
        purchase_id: purchaseId,
        event_id: eventId,
        organizer_id: user.id,
        goal_amount: goal,
        payback_note: paybackNote,
      });
  if (saveError) {
    console.error("[group gifts] Failed to save a group gift:", saveError);
    // Don't leave the item reserved for a group gift that doesn't exist.
    await supabaseAdmin.rpc("release_registry_gift", { p_purchase_id: purchaseId });
    return { error: "Couldn't start the group gift. Try again in a moment." };
  }

  after(() => sendGroupGiftStartedEmail(token));
  revalidateGift(token, await slugOf(registryId));
  return { success: true, token };
}

/** The group gift, if it's still taking pledges. */
async function openForPledges(token: unknown): Promise<{ gift: GroupGiftRow } | { error: string }> {
  const gift = await findGroupGift(token);
  if (!gift) return { error: NOT_FOUND };
  if ((await statusOfGroupGift(gift)) === "ended") return { error: "This group gift has ended." };
  return { gift };
}

/** A pledge on this group gift, by the pledger's own token. */
async function findPledge(giftId: string, pledgeToken: unknown) {
  if (!isGroupGiftToken(pledgeToken)) return null;
  const { data } = await supabaseAdmin
    .from("group_gift_pledges")
    .select("id, paid_at")
    .eq("group_gift_id", giftId)
    .eq("token", pledgeToken)
    .maybeSingle();
  return data;
}

/**
 * Chips in. A signed-in pledger's name and email come from their account;
 * anyone else gives theirs. Someone who already chipped in from this browser
 * or account changes their amount instead. Returns the pledge's token.
 */
export async function pledgeToGroupGift(input: {
  token: string;
  amount: string | number;
  name?: string;
  email?: string;
}): Promise<Result<{ pledgeToken: string }>> {
  const found = await openForPledges(input.token);
  if ("error" in found) return found;
  const { gift } = found;

  const amount = parseGroupGiftAmount(input.amount);
  if (amount === null) return { error: "Enter an amount, like 20." };

  const viewer = await getViewer();
  if (viewer && (await managesGroupGiftList(viewer.id, gift))) {
    return { error: "This group gift is a surprise for a list you manage." };
  }

  let name: string;
  let email: string | null;
  if (viewer) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", viewer.id).maybeSingle();
    name = (profile?.full_name as string | null)?.trim() || input.name?.trim() || "";
    email = viewer.email ? normalizeEmail(viewer.email) : null;
  } else {
    name = input.name?.trim() ?? "";
    email = input.email ? normalizeEmail(input.email) : null;
    if (!email || !looksLikeEmail(email)) return { error: "Add your email, so you can change this later." };
  }
  name = name.slice(0, 100);
  if (!name) return { error: "Add your name." };

  // Someone who already chipped in, as this account or with this email.
  const [{ data: byUser }, { data: byEmail }] = await Promise.all([
    viewer
      ? supabaseAdmin
          .from("group_gift_pledges")
          .select("id, token, paid_at")
          .eq("group_gift_id", gift.id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    email
      ? supabaseAdmin
          .from("group_gift_pledges")
          .select("id, token, paid_at, user_id")
          .eq("group_gift_id", gift.id)
          .eq("email", email)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // A signed-in viewer's email is their account's, so a pledge with it is
  // theirs. Anyone else proves it with the pledge token in their cookie.
  const remembered = await rememberedPledgeToken(gift.token);
  const existing = byUser ?? (byEmail && (viewer || byEmail.token === remembered) ? byEmail : null);
  if (!existing && byEmail) {
    return { error: "Someone already chipped in with this email. Use the link in that email to change it." };
  }

  if (existing) {
    if (existing.paid_at) return { error: "Your share is already marked paid, so ask the organizer to change it." };
    const { error } = await supabaseAdmin
      .from("group_gift_pledges")
      .update(viewer ? { amount, user_id: viewer.id } : { amount })
      .eq("id", existing.id);
    if (error) return { error: SOMETHING_WRONG };
    await rememberPledge(gift.token, existing.token as string);
    revalidateGift(gift.token);
    return { success: true, pledgeToken: existing.token as string };
  }

  const pledgeToken = newGroupGiftToken();
  const { data: saved, error } = await supabaseAdmin
    .from("group_gift_pledges")
    .insert({ group_gift_id: gift.id, token: pledgeToken, user_id: viewer?.id ?? null, name, email, amount })
    .select("id")
    .single();
  if (error || !saved) {
    if (error?.code === "23505") {
      return { error: "Someone already chipped in with this email. Use the link in that email to change it." };
    }
    console.error("[group gifts] Failed to save a pledge:", error);
    return { error: SOMETHING_WRONG };
  }

  await rememberPledge(gift.token, pledgeToken);
  after(() => sendPledgeEmails(gift.token, saved.id as string));
  revalidateGift(gift.token);
  return { success: true, pledgeToken };
}

/** Changes how much the pledger is chipping in. */
export async function changePledge(token: string, pledgeToken: string, amountText: string | number): Promise<Result> {
  const found = await openForPledges(token);
  if ("error" in found) return found;
  const pledge = await findPledge(found.gift.id, pledgeToken);
  if (!pledge) return { error: "We couldn't find your pledge." };
  if (pledge.paid_at) return { error: "Your share is already marked paid, so ask the organizer to change it." };
  const amount = parseGroupGiftAmount(amountText);
  if (amount === null) return { error: "Enter an amount, like 20." };

  const { error } = await supabaseAdmin.from("group_gift_pledges").update({ amount }).eq("id", pledge.id);
  if (error) return { error: SOMETHING_WRONG };
  revalidateGift(found.gift.token);
  return { success: true };
}

/** Takes back a pledge that isn't marked paid. */
export async function withdrawPledge(token: string, pledgeToken: string): Promise<Result> {
  const gift = await findGroupGift(token);
  if (!gift) return { error: NOT_FOUND };
  const pledge = await findPledge(gift.id, pledgeToken);
  if (!pledge) return { error: "We couldn't find your pledge." };
  if (pledge.paid_at) return { error: "Your share is already marked paid, so ask the organizer to send it back." };

  const { error } = await supabaseAdmin.from("group_gift_pledges").delete().eq("id", pledge.id).is("paid_at", null);
  if (error) return { error: SOMETHING_WRONG };
  await rememberPledge(gift.token, null);
  revalidateGift(gift.token);
  return { success: true };
}

/** The group gift, when the signed-in viewer organizes it. */
async function forOrganizer(token: unknown): Promise<{ gift: GroupGiftRow } | { error: string }> {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: ORGANIZER_ONLY };
  const gift = await findGroupGift(token);
  if (!gift) return { error: NOT_FOUND };
  if (gift.organizer_id !== user.id) return { error: ORGANIZER_ONLY };
  return { gift };
}

/** The organizer marks someone's share as paid back, or not. */
export async function setPledgePaid(token: string, pledgeId: string, paid: boolean): Promise<Result> {
  const found = await forOrganizer(token);
  if ("error" in found) return found;
  if (!isUuid(pledgeId)) return { error: "We couldn't find that pledge." };

  const { data, error } = await supabaseAdmin
    .from("group_gift_pledges")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("group_gift_id", found.gift.id)
    .eq("id", pledgeId)
    .select("id");
  if (error) return { error: SOMETHING_WRONG };
  if (!data || data.length === 0) return { error: "We couldn't find that pledge." };
  revalidateGift(found.gift.token);
  return { success: true };
}

/**
 * The organizer bought the item. It's main's usual confirmation, so the
 * list's owner gets the usual email, at their setting, from "Oz and others".
 */
export async function markGroupGiftBought(token: string): Promise<Result> {
  const found = await forOrganizer(token);
  if ("error" in found) return found;
  const { gift } = found;
  const status = await statusOfGroupGift(gift);
  if (status === "bought") return { success: true };
  if (status === "ended" || !gift.purchase_id) return { error: "This group gift has ended." };

  const { data: changed, error } = await supabaseAdmin.rpc("confirm_registry_gift", { p_purchase_id: gift.purchase_id });
  if (error) {
    console.error("[group gifts] Failed to confirm a group gift:", error);
    return { error: SOMETHING_WRONG };
  }
  if (changed) {
    const purchaseId = gift.purchase_id;
    after(async () => {
      try {
        await sendGiftConfirmedEmails(purchaseId);
      } catch (err) {
        console.error("[email] Failed to send gift confirmed emails for a group gift:", err);
      }
    });
  }
  revalidateGift(gift.token, await slugOf(gift.registry_id));
  return { success: true };
}

/**
 * The organizer calls it off before buying it. The item goes back on the
 * list through main's release, and everyone who chipped in hears about it.
 * The pledges stay, so the organizer can see whom to pay back.
 */
export async function callOffGroupGift(token: string): Promise<Result> {
  const found = await forOrganizer(token);
  if ("error" in found) return found;
  const { gift } = found;
  const status = await statusOfGroupGift(gift);
  if (status === "ended") return { success: true };
  if (status === "bought") return { error: "You've already bought it, so it can't be called off." };

  const { error } = await supabaseAdmin.rpc("release_registry_gift", { p_purchase_id: gift.purchase_id });
  if (error) {
    // The item was deleted from the list, so there's nothing to put back.
    // The reservation just ends.
    const { error: endError } = await supabaseAdmin
      .from("purchases")
      .update({ status: "cancelled" })
      .eq("id", gift.purchase_id!)
      .is("registry_item_id", null);
    if (endError || (await statusOfGroupGift(gift)) !== "ended") {
      console.error("[group gifts] Failed to call off a group gift:", error, endError);
      return { error: SOMETHING_WRONG };
    }
  }

  after(() => sendGroupGiftCalledOffEmails(gift.token));
  revalidateGift(gift.token, await slugOf(gift.registry_id));
  return { success: true };
}
