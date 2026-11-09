"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";
import { getBlockState, getFollowStatus } from "@/lib/follows";
import { getFollowInvite, newInviteToken, sha256 } from "@/lib/follow-invites";
import { sendFollowInviteEmail } from "@/lib/email";
import { looksLikeEmail, normalizeEmail } from "@/lib/email-address";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_INVITES_PER_DAY = 10;
const SAME_ADDRESS_GAP_DAYS = 30;
const MAX_INVITES_TO_ADDRESS_PER_WEEK = 3;

const since = (ms: number) => new Date(Date.now() - ms).toISOString();

// Whether an invite to an address that already has an account should go
// unsent. The inviter is told it was sent either way.
async function skipExistingAccount(inviterId: string, accountId: string) {
  if (accountId === inviterId) return true;

  const [blocks, status, { data: profile }] = await Promise.all([
    getBlockState(inviterId, accountId),
    getFollowStatus(inviterId, accountId),
    supabaseAdmin.from("profiles").select("email_follow_requests").eq("id", accountId).single(),
  ]);

  return (
    blocks.blockedOther ||
    blocks.blockedByOther ||
    status !== null ||
    !profile?.email_follow_requests
  );
}

/**
 * Emails someone a link that lets them approve the sender as a follower. The
 * answer doesn't say whether the address has an account: invites that go
 * unsent (the person blocked the sender, turned these emails off, or already
 * has a request from them) look the same as ones that were sent, and are
 * recorded the same way.
 */
export async function sendFollowInvite(rawEmail: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const email = normalizeEmail(rawEmail || "");
  if (!looksLikeEmail(email)) return { error: "Enter a whole email address." };
  if (user.email && normalizeEmail(user.email) === email) {
    return { error: "That's your own email address." };
  }

  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const inviterName = me?.full_name?.trim();
  if (!inviterName) {
    return { error: "Add your name on your account page first, so they know who's asking." };
  }

  const emailHash = sha256(email);
  const [{ count: sentToday }, { data: earlier }, { count: toAddressThisWeek }] = await Promise.all([
    supabaseAdmin
      .from("follow_invites")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", user.id)
      .gte("created_at", since(DAY_MS)),
    supabaseAdmin
      .from("follow_invites")
      .select("id")
      .eq("inviter_id", user.id)
      .eq("email_hash", emailHash)
      .gte("created_at", since(SAME_ADDRESS_GAP_DAYS * DAY_MS))
      .limit(1),
    supabaseAdmin
      .from("follow_invites")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .gte("created_at", since(7 * DAY_MS)),
  ]);

  if ((sentToday ?? 0) >= MAX_INVITES_PER_DAY) {
    return { error: "You've sent a lot of invites today. Try again tomorrow." };
  }
  if (earlier && earlier.length > 0) {
    return { error: `You already invited this address in the last ${SAME_ADDRESS_GAP_DAYS} days.` };
  }

  const token = newInviteToken();
  const { error } = await supabaseAdmin
    .from("follow_invites")
    .insert({ inviter_id: user.id, email_hash: emailHash, token_hash: sha256(token) });
  if (error) return { error: error.message };

  // An address can't be flooded by several people inviting it.
  let send = (toAddressThisWeek ?? 0) < MAX_INVITES_TO_ADDRESS_PER_WEEK;
  if (send) {
    const { data: accountId } = await supabaseAdmin.rpc("account_id_for_email", { p_email: email });
    if (accountId && (await skipExistingAccount(user.id, accountId as string))) send = false;
  }

  if (send) {
    after(() => sendFollowInviteEmail({ toEmail: email, inviterName, token }));
  }
  return { success: true };
}

export async function acceptFollowInvite(token: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const invite = await getFollowInvite(token);
  if (!invite || invite.status !== "open") {
    return { error: "This invite has already been answered or has expired." };
  }
  if (invite.inviterId === user.id) {
    return { error: "This is your own invite. Send the link to the person you invited." };
  }

  const blocks = await getBlockState(user.id, invite.inviterId);
  if (blocks.blockedOther) {
    return { error: "You've blocked this person. Unblock them on your account page first." };
  }
  if (blocks.blockedByOther) return { error: "This invite has already been answered or has expired." };

  // Marking it used first means the same link can't be accepted twice at once.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("follow_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id");
  if (claimError) return { error: claimError.message };
  if (!claimed || claimed.length === 0) {
    return { error: "This invite has already been answered or has expired." };
  }

  // Approves an earlier request from the inviter too, if there was one.
  const { error } = await supabaseAdmin.from("follows").upsert(
    {
      follower_id: invite.inviterId,
      followee_id: user.id,
      status: "approved",
      approved_at: new Date().toISOString(),
    },
    { onConflict: "follower_id,followee_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/u/[profile]", "page");
  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/following");
  return { success: true };
}

export async function declineFollowInvite(token: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const invite = await getFollowInvite(token);
  if (!invite || invite.status !== "open") return { success: true };

  const { error } = await supabaseAdmin
    .from("follow_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_at", null);
  if (error) return { error: error.message };

  return { success: true };
}
