import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PersonSummary } from "@/lib/follows";

// Server-side reads of `follow_invites`, which the API roles can't reach (see
// 017_profile_links_and_email_search.sql). Invites keep only hashes of the
// address and the token.

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export type FollowInviteStatus = "open" | "used" | "expired";

export interface FollowInviteDetails {
  id: string;
  inviterId: string;
  inviter: PersonSummary;
  status: FollowInviteStatus;
}

export async function getFollowInvite(token: string): Promise<FollowInviteDetails | null> {
  if (!token || token.length > 64) return null;

  const { data } = await supabaseAdmin
    .from("follow_invites")
    .select("id, inviter_id, expires_at, used_at, inviter:profiles!follow_invites_inviter_id_fkey(public_id, full_name)")
    .eq("token_hash", sha256(token))
    .maybeSingle();

  const row = data as unknown as {
    id: string;
    inviter_id: string;
    expires_at: string;
    used_at: string | null;
    inviter: PersonSummary | null;
  } | null;
  if (!row?.inviter) return null;

  return {
    id: row.id,
    inviterId: row.inviter_id,
    inviter: row.inviter,
    status: row.used_at ? "used" : Date.parse(row.expires_at) < Date.now() ? "expired" : "open",
  };
}
