"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";
import { getBlockState } from "@/lib/follows";
import { notifyFollowRequest } from "@/lib/email";
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
  revalidatePath("/dashboard/following");
}

// Removes any follow between two people, in either direction.
function deleteFollowsBetween(a: string, b: string) {
  return supabaseAdmin
    .from("follows")
    .delete()
    .or(`and(follower_id.eq.${a},followee_id.eq.${b}),and(follower_id.eq.${b},followee_id.eq.${a})`);
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

  const blocks = await getBlockState(user.id, target.id);
  if (blocks.blockedOther) {
    return { error: "You've blocked this person. Unblock them on your account page first." };
  }
  if (blocks.blockedByOther) return { error: "You can't follow this person." };

  const { data: existing } = await supabaseAdmin
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("followee_id", target.id)
    .maybeSingle();

  // Asking again leaves an existing request or approval as it is.
  if (!existing) {
    const { error } = await supabaseAdmin
      .from("follows")
      .upsert(
        { follower_id: user.id, followee_id: target.id },
        { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
      );
    if (error) return { error: error.message };

    after(() => notifyFollowRequest({ followerId: user.id, followeeId: target.id }));
  }

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

export async function blockUser(username: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const target = await profileByUsername(username);
  if (!target) return { error: "That profile doesn't exist." };
  if (target.id === user.id) return { error: "You can't block yourself." };

  const { error } = await supabaseAdmin
    .from("user_blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: target.id },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  if (error) return { error: error.message };

  const { error: followsError } = await deleteFollowsBetween(user.id, target.id);
  if (followsError) return { error: followsError.message };

  revalidateFollowPages(target.username);
  return { success: true };
}

export async function unblockUser(username: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const target = await profileByUsername(username);
  if (!target) return { error: "That profile doesn't exist." };

  const { error } = await supabaseAdmin
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", target.id);
  if (error) return { error: error.message };

  revalidateFollowPages(target.username);
  return { success: true };
}

export type SearchResult = {
  username: string;
  full_name: string | null;
  state: "needs-profile" | "none" | "pending" | "approved";
};

const MIN_SEARCH_LENGTH = 3;
const MAX_SEARCH_RESULTS = 10;

export async function searchPeople(
  rawQuery: string,
): Promise<{ results: SearchResult[]; error?: string | null }> {
  const { user, error: authError } = await requireAccount();
  if (!user) return { results: [], error: authError };

  // Keep letters, numbers, spaces, hyphens, apostrophes and periods. The Data
  // API treats * and % as wildcards in a like filter, so anything else could
  // turn a search into "list everyone".
  const query = (rawQuery || "")
    .replace(/^@/, "")
    .replace(/[^\p{L}\p{N}\s'.-]/gu, "")
    .trim()
    .slice(0, 60);
  if (query.length < MIN_SEARCH_LENGTH) return { results: [] };

  const searchable = () =>
    supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .eq("discoverable", true)
      .not("username", "is", null)
      .neq("id", user.id)
      .limit(MAX_SEARCH_RESULTS);

  const [{ data: byUsername }, { data: byName }, { data: blocks }, { data: me }] = await Promise.all([
    searchable().ilike("username", `${query.toLowerCase()}%`),
    searchable().ilike("full_name", `%${query}%`),
    supabaseAdmin
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    supabaseAdmin.from("profiles").select("username").eq("id", user.id).single(),
  ]);

  const blockedIds = new Set(
    (blocks || []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id)),
  );
  const seen = new Set<string>();
  const people = [...(byUsername || []), ...(byName || [])]
    .filter((p) => !blockedIds.has(p.id) && !seen.has(p.id) && seen.add(p.id))
    .slice(0, MAX_SEARCH_RESULTS);
  if (people.length === 0) return { results: [] };

  const { data: follows } = await supabaseAdmin
    .from("follows")
    .select("followee_id, status")
    .eq("follower_id", user.id)
    .in(
      "followee_id",
      people.map((p) => p.id),
    );
  const statusById = new Map((follows || []).map((f) => [f.followee_id, f.status]));

  return {
    results: people.map((p) => ({
      username: p.username,
      full_name: p.full_name,
      state: !me?.username
        ? "needs-profile"
        : ((statusById.get(p.id) as "pending" | "approved" | undefined) ?? "none"),
    })),
  };
}
