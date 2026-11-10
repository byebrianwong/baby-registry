"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";
import { getBlockState } from "@/lib/follows";
import { notifyFollowRequest } from "@/lib/email";
import { isValidPublicId } from "@/lib/profile-link";
import { looksLikeEmail, normalizeEmail } from "@/lib/email-address";

// People are addressed by the public id in their profile link, so the browser
// never handles user ids.
async function profileByPublicId(raw: string) {
  const publicId = (raw || "").trim().toLowerCase();
  if (!isValidPublicId(publicId)) return null;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, public_id")
    .eq("public_id", publicId)
    .maybeSingle();

  return data as { id: string; public_id: string } | null;
}

function revalidateFollowPages() {
  revalidatePath("/u/[profile]", "page");
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

export async function requestFollow(publicId: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  // The person approving needs to see who's asking.
  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  if (!me?.full_name?.trim()) {
    return { error: "Add your name on your account page first, so people can see who's asking." };
  }

  const target = await profileByPublicId(publicId);
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

  revalidateFollowPages();
  return { success: true };
}

// Withdraws a request, or unfollows.
export async function cancelFollow(publicId: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const target = await profileByPublicId(publicId);
  if (!target) return { error: "That profile doesn't exist." };

  const { error } = await supabaseAdmin
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", target.id);
  if (error) return { error: error.message };

  revalidateFollowPages();
  return { success: true };
}

export async function approveFollower(publicId: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const follower = await profileByPublicId(publicId);
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

  revalidateFollowPages();
  return { success: true };
}

// Declines a request, or removes an approved follower.
export async function removeFollower(publicId: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const follower = await profileByPublicId(publicId);
  if (!follower) return { error: "That profile doesn't exist." };

  const { error } = await supabaseAdmin
    .from("follows")
    .delete()
    .eq("follower_id", follower.id)
    .eq("followee_id", user.id);
  if (error) return { error: error.message };

  revalidateFollowPages();
  return { success: true };
}

export async function blockUser(publicId: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const target = await profileByPublicId(publicId);
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

  revalidateFollowPages();
  return { success: true };
}

export async function unblockUser(publicId: string) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const target = await profileByPublicId(publicId);
  if (!target) return { error: "That profile doesn't exist." };

  const { error } = await supabaseAdmin
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", target.id);
  if (error) return { error: error.message };

  revalidateFollowPages();
  return { success: true };
}

export type SearchResult = {
  public_id: string;
  full_name: string | null;
  state: "self" | "none" | "pending" | "approved";
};

export type SearchResponse = {
  results: SearchResult[];
  /** "email" when the query was a whole email address, which offers an invite when nobody matches. */
  kind?: "name" | "email";
  error?: string | null;
};

const MIN_SEARCH_LENGTH = 3;
const MAX_SEARCH_RESULTS = 10;
const MAX_EMAIL_SEARCHES_PER_HOUR = 30;
// Name searches run as you type, so this is higher than the email cap.
const MAX_NAME_SEARCHES_PER_HOUR = 100;
const HOUR_MS = 60 * 60 * 1000;

type FoundProfile = { id: string; public_id: string; full_name: string | null };

// Logs one search in `table` and says whether the searcher was still under
// `max` for the last hour. A search over the cap isn't logged. If the count
// fails (say the table doesn't exist yet), the search is allowed.
async function underHourlyLimit(
  table: "email_searches" | "name_searches",
  searcherId: string,
  max: number,
) {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count } = await supabaseAdmin
    .from(table)
    .select("searcher_id", { count: "exact", head: true })
    .eq("searcher_id", searcherId)
    .gte("searched_at", since);
  if ((count ?? 0) >= max) return false;

  // Only the last hour counts, so older rows can go.
  await Promise.all([
    supabaseAdmin.from(table).insert({ searcher_id: searcherId }),
    supabaseAdmin.from(table).delete().eq("searcher_id", searcherId).lt("searched_at", since),
  ]);
  return true;
}

// The profile behind an exact email address, if its owner lets people find
// them that way. Counts against the searcher's hourly limit either way.
async function findByEmail(searcherId: string, email: string) {
  if (!(await underHourlyLimit("email_searches", searcherId, MAX_EMAIL_SEARCHES_PER_HOUR))) {
    return { error: "You've looked up a lot of email addresses. Try again in an hour." };
  }

  const { data: accountId } = await supabaseAdmin.rpc("account_id_for_email", { p_email: email });
  if (!accountId) return { people: [] as FoundProfile[] };

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, public_id, full_name")
    .eq("id", accountId as string)
    .eq("findable_by_email", true)
    .maybeSingle();
  return { people: data ? [data as FoundProfile] : [] };
}

// Findable profiles whose name contains the query. Each search that reaches
// the database counts against the searcher's hourly limit, so one account
// can't list everyone by trying name after name.
async function findByName(searcherId: string, rawQuery: string) {
  // Keep letters, numbers, spaces, hyphens, apostrophes and periods. The Data
  // API treats * and % as wildcards in a like filter, so anything else could
  // turn a search into "list everyone".
  const query = rawQuery
    .replace(/[^\p{L}\p{N}\s'.-]/gu, "")
    .trim()
    .slice(0, 60);
  if (query.length < MIN_SEARCH_LENGTH) return { people: [] as FoundProfile[] };

  if (!(await underHourlyLimit("name_searches", searcherId, MAX_NAME_SEARCHES_PER_HOUR))) {
    return { error: "You've searched a lot in the last hour. Try again later." };
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, public_id, full_name")
    .eq("discoverable", true)
    .ilike("full_name", `%${query}%`)
    .limit(MAX_SEARCH_RESULTS);
  return { people: (data || []) as FoundProfile[] };
}

export async function searchPeople(rawQuery: string): Promise<SearchResponse> {
  const { user, error: authError } = await requireAccount();
  if (!user) return { results: [], error: authError };

  const trimmed = (rawQuery || "").trim();
  const kind = looksLikeEmail(trimmed) ? "email" : "name";

  const search =
    kind === "email"
      ? await findByEmail(user.id, normalizeEmail(trimmed))
      : await findByName(user.id, trimmed);
  if ("error" in search) return { results: [], kind, error: search.error };
  const found = search.people;

  // Searchers see themselves too, under the same rules as everyone else, so
  // finding yourself shows that other people can find you.
  const { data: blocks } = await supabaseAdmin
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

  const blockedIds = new Set(
    (blocks || []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id)),
  );
  const people = found.filter((p) => !blockedIds.has(p.id)).slice(0, MAX_SEARCH_RESULTS);
  if (people.length === 0) return { results: [], kind };

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
    kind,
    results: people.map((p) => ({
      public_id: p.public_id,
      full_name: p.full_name,
      state:
        p.id === user.id
          ? "self"
          : ((statusById.get(p.id) as "pending" | "approved" | undefined) ?? "none"),
    })),
  };
}
