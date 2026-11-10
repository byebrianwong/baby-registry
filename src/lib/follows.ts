import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LISTED_REGISTRY_COLUMNS, type ListedRegistry } from "@/lib/registry-listing";

// Server-side reads of `follows`, which the API roles can't reach (see
// 012_follows.sql). These take raw user ids, so only call them from server
// components with an id you got from auth, and never export them from a
// "use server" file, where the browser could call them with any id.

export type FollowStatus = "pending" | "approved";

export interface PersonSummary {
  public_id: string;
  full_name: string | null;
}

export interface FollowPerson extends PersonSummary {
  status: FollowStatus;
}

export interface FeedRegistry extends ListedRegistry {
  owner: PersonSummary;
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

// Whether either person has blocked the other.
export async function getBlockState(userId: string, otherId: string) {
  const { data } = await supabaseAdmin
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
    );
  const rows = data || [];
  return {
    blockedOther: rows.some((row) => row.blocker_id === userId),
    blockedByOther: rows.some((row) => row.blocker_id === otherId),
  };
}

// The top bar and the dashboard both show this count, so it's cached for the
// request and counted once.
export const countFollowRequests = cache(async (userId: string): Promise<number> => {
  const { count } = await supabaseAdmin
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_id", userId)
    .eq("status", "pending");
  return count ?? 0;
});

type JoinedProfile = PersonSummary | null;

function toPeople(
  rows: { status: string; person: JoinedProfile }[] | null,
): FollowPerson[] {
  return (rows || [])
    .filter((row) => row.person)
    .map((row) => ({
      public_id: row.person!.public_id,
      full_name: row.person!.full_name,
      status: row.status as FollowStatus,
    }));
}

export async function listFollows(userId: string) {
  const [{ data: incoming }, { data: outgoing }, { data: blockedRows }] = await Promise.all([
    supabaseAdmin
      .from("follows")
      .select("status, person:profiles!follows_follower_id_fkey(public_id, full_name)")
      .eq("followee_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("follows")
      .select("status, person:profiles!follows_followee_id_fkey(public_id, full_name)")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("user_blocks")
      .select("person:profiles!user_blocks_blocked_id_fkey(public_id, full_name)")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const people = toPeople(incoming as never);
  const blocked: PersonSummary[] = ((blockedRows || []) as unknown as { person: JoinedProfile }[])
    .filter((row) => row.person)
    .map((row) => ({ public_id: row.person!.public_id, full_name: row.person!.full_name }));
  return {
    requests: people.filter((p) => p.status === "pending"),
    followers: people.filter((p) => p.status === "approved"),
    following: toPeople(outgoing as never),
    blocked,
  };
}

// Everyone the user follows, plus the registries listed by the people who've
// approved them. Approved followers see private listed registries too, the same
// as on each profile.
export async function listFollowingFeed(userId: string) {
  const { data: rows } = await supabaseAdmin
    .from("follows")
    .select("status, person:profiles!follows_followee_id_fkey(id, public_id, full_name)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  type Row = {
    status: FollowStatus;
    person: { id: string; public_id: string; full_name: string | null } | null;
  };
  const followed = ((rows || []) as unknown as Row[]).filter((row) => row.person);

  const people: FollowPerson[] = followed.map((row) => ({
    public_id: row.person!.public_id,
    full_name: row.person!.full_name,
    status: row.status,
  }));

  const approvedOwners = new Map(
    followed
      .filter((row) => row.status === "approved")
      .map((row) => [
        row.person!.id,
        { public_id: row.person!.public_id, full_name: row.person!.full_name },
      ]),
  );
  if (approvedOwners.size === 0) return { people, registries: [] as FeedRegistry[] };

  const { data: listed } = await supabaseAdmin
    .from("registries")
    .select(`${LISTED_REGISTRY_COLUMNS}, owner_id`)
    .in("owner_id", [...approvedOwners.keys()])
    .eq("listed_on_profile", true);

  // owner_id is only used to match owners here; it isn't passed on.
  const registries: FeedRegistry[] = ((listed || []) as (ListedRegistry & { owner_id: string })[]).map(
    ({ owner_id, ...registry }) => ({ ...registry, owner: approvedOwners.get(owner_id)! }),
  );

  return { people, registries };
}
