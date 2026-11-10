"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { acceptFollowInvite, declineFollowInvite } from "@/lib/actions/follow-invites";
import type { PersonSummary } from "@/lib/follows";
import { displayName, profilePath } from "@/lib/profile-link";

export type FollowInviteView = "signed-out" | "open" | "own" | "answered" | "expired" | "invalid";

/** What someone sees when they open a follow invite from an email. */
export function FollowInviteCard({
  view: initialView,
  inviter,
  token,
  logoHref = "/",
  acceptAction = acceptFollowInvite,
  declineAction = declineFollowInvite,
}: {
  view: FollowInviteView;
  /** Null when the link doesn't match an invite. */
  inviter: PersonSummary | null;
  token: string;
  logoHref?: string;
  acceptAction?: typeof acceptFollowInvite;
  declineAction?: typeof declineFollowInvite;
}) {
  const [view, setView] = useState<FollowInviteView | "accepted" | "declined">(initialView);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const name = inviter ? displayName(inviter) : "Someone";
  const returnTo = encodeURIComponent(`/follow-invite/${token}`);

  const answer = async (action: typeof acceptAction, next: "accepted" | "declined") => {
    setBusy(true);
    setError("");
    const result = await action(token);
    if (result?.error) {
      setError(result.error);
    } else {
      setView(next);
    }
    setBusy(false);
  };

  let title = `${name} wants to follow you`;
  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  switch (view) {
    case "signed-out":
      body = (
        <>
          If you say yes, they&apos;ll see the registries you choose to show on your Regibee profile.
          Create a free account or log in to answer.
        </>
      );
      actions = (
        <>
          <Button asChild>
            <Link href={`/signup?redirect=${returnTo}`}>Create account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/login?redirect=${returnTo}`}>Log in</Link>
          </Button>
        </>
      );
      break;
    case "open":
      body = (
        <>
          If you say yes, they&apos;ll see the registries you choose to show on your profile,
          including private ones. You can remove them as a follower at any time.
        </>
      );
      actions = (
        <>
          <Button disabled={busy} onClick={() => answer(acceptAction, "accepted")}>
            Let {name} follow me
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => answer(declineAction, "declined")}>
            No thanks
          </Button>
        </>
      );
      break;
    case "accepted":
      title = `${name} follows you now`;
      body = <>They&apos;ll see the registries you show on your profile. You choose which ones on your account page.</>;
      actions = (
        <>
          <Button asChild>
            <Link href="/dashboard/account">Choose registries</Link>
          </Button>
          {inviter && (
            <Button variant="outline" asChild>
              <Link href={profilePath(inviter)}>See {name}&apos;s profile</Link>
            </Button>
          )}
        </>
      );
      break;
    case "declined":
      title = "Invite declined";
      body = <>We won&apos;t tell {name}.</>;
      actions = (
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to your dashboard</Link>
        </Button>
      );
      break;
    case "own":
      title = "This is your invite";
      body = <>Send the link to the person you invited. They&apos;ll need to open it themselves.</>;
      break;
    case "answered":
      title = "This invite has been answered";
      body = <>Each invite link works once.</>;
      break;
    case "expired":
      title = "This invite has expired";
      body = <>Invites last 30 days. Ask {name} to send a new one.</>;
      break;
    case "invalid":
      title = "This invite link doesn't work";
      body = <>Check that the whole link was copied from the email.</>;
      break;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href={logoHref} className="mx-auto mb-4 flex items-center gap-2 font-semibold">
            <Logo size="lg" />
          </Link>
          <CardTitle className="break-words text-2xl">{title}</CardTitle>
          {body && <CardDescription>{body}</CardDescription>}
        </CardHeader>
        {(actions || error) && (
          <CardContent className="space-y-3">
            {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
            {error && <p className="text-center text-sm text-error-primary">{error}</p>}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
