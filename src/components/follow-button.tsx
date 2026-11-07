"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cancelFollow, requestFollow } from "@/lib/actions/follows";

export type FollowButtonState =
  | "signed-out"
  | "needs-profile"
  | "none"
  | "pending"
  | "approved"
  | "blocked";

export function FollowButton({
  username,
  state: initialState,
  returnTo,
  requestAction = requestFollow,
  cancelAction = cancelFollow,
}: {
  username: string;
  state: FollowButtonState;
  /** Where to come back to after logging in. Defaults to the profile. */
  returnTo?: string;
  requestAction?: typeof requestFollow;
  cancelAction?: typeof cancelFollow;
}) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (state === "signed-out") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button size="sm" className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white" asChild>
          <Link href={`/login?redirect=${encodeURIComponent(returnTo ?? `/u/${username}`)}`}>Follow</Link>
        </Button>
        <p className="text-xs text-tertiary">Log in to ask to follow @{username}.</p>
      </div>
    );
  }

  if (state === "needs-profile") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button size="sm" variant="outline" asChild>
          <Link href="/dashboard/account">Claim a username to follow</Link>
        </Button>
        <p className="text-xs text-tertiary">So @{username} can see who&apos;s asking.</p>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button size="sm" variant="outline" disabled>
          Blocked
        </Button>
        <p className="text-xs text-tertiary">
          You blocked @{username}.{" "}
          <Link href="/dashboard/account#follows" className="font-medium text-[#004659] hover:underline">
            Unblock
          </Link>
        </p>
      </div>
    );
  }

  const run = async (next: FollowButtonState, action: () => ReturnType<typeof requestFollow>) => {
    setBusy(true);
    setError("");
    const result = await action();
    if (result?.error) {
      setError(result.error);
    } else {
      setState(next);
    }
    setBusy(false);
  };

  const handleClick = () => {
    if (state === "none") {
      run("pending", () => requestAction(username));
    } else if (state === "pending") {
      if (confirm(`Withdraw your request to follow @${username}?`)) {
        run("none", () => cancelAction(username));
      }
    } else if (
      confirm(`Unfollow @${username}? You'll stop seeing their private registries.`)
    ) {
      run("none", () => cancelAction(username));
    }
  };

  const hint = {
    none: `@${username} approves every follower.`,
    pending: `Waiting for @${username} to approve.`,
    approved: `You can see @${username}'s private registries.`,
  }[state];

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        size="sm"
        variant={state === "none" ? "default" : "outline"}
        className={
          state === "none"
            ? "!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
            : undefined
        }
        onClick={handleClick}
        disabled={busy}
      >
        {state === "none" ? "Follow" : state === "pending" ? "Requested" : "Following"}
      </Button>
      <p className="text-xs text-tertiary">{hint}</p>
      {error && <p className="text-xs text-error-primary">{error}</p>}
    </div>
  );
}
