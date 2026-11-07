"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";
import { isValidUsernameFormat, normalizeUsername } from "@/lib/username";

// People are addressed by username here, so the browser never handles user ids.
async function profileByUsername(raw: string) {
  const username = normalizeUsername(raw || "");
  if (!isValidUsernameFormat(username)) return null;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  return data as { id: string; username: string } | null;
}

function revalidateFollowPages(username: string) {
  revalidatePath(`/u/${username}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
}

export async function requestFollow(username: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  // The person approving needs to see who's asking, so followers need a
  // username of their own.
  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  if (!me?.username) {
    return { error: "Claim a username first, so people can see who's asking to follow them." };
  }

  const target = await profileByUsername(username);
  if (!target) return { error: "That profile doesn't exist." };
  if (target.id === user.id) return { error: "You can't follow yourself." };

  // Asking again leaves an existing request or approval as it is.
  const { error } = await supabaseAdmin
    .from("follows")
    .upsert(
      { follower_id: user.id, followee_id: target.id },
      { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
    );
  if (error) return { error: error.message };

  revalidateFollowPages(target.username);
  return { success: true };
}

// Withdraws a request, or unfollows.
export async function cancelFollow(username: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const target = await profileByUsername(username);
  if (!target) return { error: "That profile doesn't exist." };

  const { error } = await supabaseAdmin
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", target.id);
  if (error) return { error: error.message };

  revalidateFollowPages(target.username);
  return { success: true };
}

export async function approveFollower(username: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const follower = await profileByUsername(username);
  if (!follower) return { error: "That profile doesn't exist." };

  const { data, error } = await supabaseAdmin
    .from("follows")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("follower_id", follower.id)
    .eq("followee_id", user.id)
    .eq("status", "pending")
    .select("follower_id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "That request was withdrawn or already handled." };
  }

  revalidateFollowPages(follower.username);
  return { success: true };
}

// Declines a request, or removes an approved follower.
export async function removeFollower(username: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const follower = await profileByUsername(username);
  if (!follower) return { error: "That profile doesn't exist." };

  const { error } = await supabaseAdmin
    .from("follows")
    .delete()
    .eq("follower_id", follower.id)
    .eq("followee_id", user.id);
  if (error) return { error: error.message };

  revalidateFollowPages(follower.username);
  return { success: true };
}
