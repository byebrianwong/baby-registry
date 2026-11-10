"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cancelFollow, requestFollow } from "@/lib/actions/follows";

export type FollowButtonState = "signed-out" | "none" | "pending" | "approved" | "blocked";

/** The states a signed-in viewer can change by clicking the button. */
export type FollowToggleState = "none" | "pending" | "approved";

/**
 * Follow state for one person, and the click that changes it. FollowButton
 * uses it, and so does the people search, which lays out the hint itself.
 */
export function useFollow<State extends FollowButtonState>({
  publicId,
  name,
  state: initialState,
  requestAction = requestFollow,
  cancelAction = cancelFollow,
}: {
  publicId: string;
  name: string;
  state: State;
  requestAction?: typeof requestFollow;
  cancelAction?: typeof cancelFollow;
}) {
  const [state, setState] = useState<State | FollowToggleState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (next: FollowToggleState, action: () => ReturnType<typeof requestFollow>) => {
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

  const toggle = () => {
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

  return { state, busy, error, toggle };
}

/** Follow, Requested or Following, for a signed-in viewer. */
export function FollowToggle({
  state,
  busy,
  onClick,
}: {
  state: FollowToggleState;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant={state === "none" ? "default" : "outline"} onClick={onClick} disabled={busy}>
      {state === "none" ? "Follow" : state === "pending" ? "Requested" : "Following"}
    </Button>
  );
}

/**
 * Goes after the "waiting for approval" hint, because nothing on the
 * Requested button says that clicking it withdraws the request. It runs the
 * same toggle, so it asks first too.
 */
export function WithdrawRequest({
  name,
  busy,
  onClick,
}: {
  name: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={`Withdraw your request to follow ${name}`}
      className="cursor-pointer font-medium text-brand-600 hover:underline disabled:cursor-default disabled:opacity-50"
    >
      Withdraw
    </button>
  );
}

export function FollowButton({
  publicId,
  name,
  state: initialState,
  returnTo,
  requestAction,
  cancelAction,
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
  const { state, busy, error, toggle } = useFollow({
    publicId,
    name,
    state: initialState,
    requestAction,
    cancelAction,
  });

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

  const hint = {
    none: `${name} approves every follower.`,
    pending: `Waiting for ${name} to approve.`,
    approved: `You can see ${name}'s private registries.`,
  }[state];

  return (
    <div className="flex flex-col items-center gap-1">
      <FollowToggle state={state} busy={busy} onClick={toggle} />
      <p className="text-xs text-tertiary">
        {hint}
        {state === "pending" && (
          <>
            {" "}
            <WithdrawRequest name={name} busy={busy} onClick={toggle} />
          </>
        )}
      </p>
      {error && <p className="text-xs text-error-primary">{error}</p>}
    </div>
  );
}
