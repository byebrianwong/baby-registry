import { supabaseAdmin } from "@/lib/supabase-admin";

// Server-side reads of `follows`, which the API roles can't reach (see
// 012_follows.sql). These take raw user ids, so only call them from server
// components with an id you got from auth, and never export them from a
// "use server" file, where the browser could call them with any id.

export type FollowStatus = "pending" | "approved";

export interface FollowPerson {
  username: string;
  full_name: string | null;
  status: FollowStatus;
}

export async function getFollowStatus(
  followerId: string,
  followeeId: string,
): Promise<FollowStatus | null> {
  const { data } = await supabaseAdmin
    .from("follows")
    .select("status")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  return (data?.status as FollowStatus | undefined) ?? null;
}

export async function countFollowRequests(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_id", userId)
    .eq("status", "pending");
  return count ?? 0;
}

type JoinedProfile = { username: string | null; full_name: string | null } | null;

function toPeople(
  rows: { status: string; person: JoinedProfile }[] | null,
): FollowPerson[] {
  return (rows || [])
    .filter((row) => row.person?.username)
    .map((row) => ({
      username: row.person!.username!,
      full_name: row.person!.full_name,
      status: row.status as FollowStatus,
    }));
}

export async function listFollows(userId: string) {
  const [{ data: incoming }, { data: outgoing }] = await Promise.all([
    supabaseAdmin
      .from("follows")
      .select("status, person:profiles!follows_follower_id_fkey(username, full_name)")
      .eq("followee_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("follows")
      .select("status, person:profiles!follows_followee_id_fkey(username, full_name)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const people = toPeople(incoming as never);
  return {
    requests: people.filter((p) => p.status === "pending"),
    followers: people.filter((p) => p.status === "approved"),
    following: toPeople(outgoing as never),
  };
}
