import type { Metadata } from "next";
import { FollowInviteCard, type FollowInviteView } from "@/components/follow-invite-card";
import { getFollowInvite } from "@/lib/follow-invites";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Follow invite | Regibee",
  robots: { index: false, follow: false },
};

// Where a follow invite email leads (see sendFollowInvite in
// src/lib/actions/follow-invites.ts). Saying yes makes the inviter a follower
// of whoever is signed in.
export default async function FollowInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, viewer] = await Promise.all([getFollowInvite(token), getViewer()]);

  let view: FollowInviteView;
  if (!invite) view = "invalid";
  else if (invite.status === "used") view = "answered";
  else if (invite.status === "expired") view = "expired";
  else if (!viewer) view = "signed-out";
  else if (viewer.id === invite.inviterId) view = "own";
  else view = "open";

  return (
    <FollowInviteCard
      view={view}
      inviter={invite?.inviter ?? null}
      token={token}
      logoHref={viewer ? "/dashboard" : "/"}
    />
  );
}
