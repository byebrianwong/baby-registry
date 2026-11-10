"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cancelFollow, requestFollow } from "@/lib/actions/follows";

export type FollowButtonState = "signed-out" | "none" | "pending" | "approved" | "blocked";

export function FollowButton({
  publicId,
  name,
  state: initialState,
  returnTo,
  requestAction = requestFollow,
  cancelAction = cancelFollow,
}: {
  /** The id from the person's profile link. */
  publicId: string;
  /** The person's name, for the hints under the button. */
  name: string;
  state: FollowButtonState;
  /** Where to come back to after logging in. */
  returnTo: string;
  requestAction?: typeof requestFollow;
  cancelAction?: typeof cancelFollow;
}) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (state === "signed-out") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Button size="sm" asChild>
          <Link href={`/login?redirect=${encodeURIComponent(returnTo)}`}>Follow</Link>
        </Button>
        <p className="text-xs text-tertiary">Log in to ask to follow {name}.</p>
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
          You blocked {name}.{" "}
          <Link href="/dashboard/account#follows" className="font-medium text-brand-600 hover:underline">
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
      run("pending", () => requestAction(publicId));
    } else if (state === "pending") {
      if (confirm(`Withdraw your request to follow ${name}?`)) {
        run("none", () => cancelAction(publicId));
      }
    } else if (confirm(`Unfollow ${name}? You'll stop seeing their private registries.`)) {
      run("none", () => cancelAction(publicId));
    }
  };

  const hint = {
    none: `${name} approves every follower.`,
    pending: `Waiting for ${name} to approve.`,
    approved: `You can see ${name}'s private registries.`,
  }[state];

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        size="sm"
        variant={state === "none" ? "default" : "outline"}
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
