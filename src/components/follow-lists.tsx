"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveFollower,
  blockUser,
  cancelFollow,
  removeFollower,
  unblockUser,
} from "@/lib/actions/follows";
import type { FollowPerson, PersonSummary } from "@/lib/follows";

function PersonLabel({ person }: { person: PersonSummary }) {
  return (
    <Link href={`/u/${person.username}`} className="min-w-0 flex-1 hover:underline">
      <span className="block break-words text-sm font-medium text-primary">
        {person.full_name?.trim() || `@${person.username}`}
      </span>
      <span className="block break-words text-sm text-tertiary">@{person.username}</span>
    </Link>
  );
}

function PersonRow({
  person,
  actions,
}: {
  person: PersonSummary;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PersonLabel person={person} />
      <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function FollowLists({
  requests: initialRequests,
  followers: initialFollowers,
  following: initialFollowing,
  blocked: initialBlocked = [],
  approveAction = approveFollower,
  removeAction = removeFollower,
  cancelAction = cancelFollow,
  blockAction = blockUser,
  unblockAction = unblockUser,
}: {
  requests: FollowPerson[];
  followers: FollowPerson[];
  following: FollowPerson[];
  blocked?: PersonSummary[];
  approveAction?: typeof approveFollower;
  removeAction?: typeof removeFollower;
  cancelAction?: typeof cancelFollow;
  blockAction?: typeof blockUser;
  unblockAction?: typeof unblockUser;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [followers, setFollowers] = useState(initialFollowers);
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const act = async (key: string, action: () => ReturnType<typeof approveFollower>, onDone: () => void) => {
    setBusy(key);
    setError("");
    const result = await action();
    if (result?.error) {
      setError(result.error);
    } else {
      onDone();
    }
    setBusy(null);
  };

  const without = <T extends PersonSummary>(list: T[], person: PersonSummary) =>
    list.filter((p) => p.username !== person.username);

  const block = (person: PersonSummary) => {
    if (
      !confirm(
        `Block @${person.username}? They'll be removed from your followers and the people you follow, and won't be able to ask to follow you.`,
      )
    ) {
      return;
    }
    act(`block-${person.username}`, () => blockAction(person.username), () => {
      setRequests((list) => without(list, person));
      setFollowers((list) => without(list, person));
      setFollowing((list) => without(list, person));
      setBlocked((list) => [{ username: person.username, full_name: person.full_name }, ...without(list, person)]);
    });
  };

  const blockButton = (person: PersonSummary) => (
    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => block(person)}>
      Block
    </Button>
  );

  return (
    <>
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Follow requests</CardTitle>
            <CardDescription>
              People you approve can see the private registries on your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.map((person) => (
              <PersonRow
                key={person.username}
                person={person}
                actions={
                  <>
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        act(`approve-${person.username}`, () => approveAction(person.username), () => {
                          setRequests(without(requests, person));
                          setFollowers([{ ...person, status: "approved" }, ...followers]);
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() =>
                        act(`decline-${person.username}`, () => removeAction(person.username), () =>
                          setRequests(without(requests, person)),
                        )
                      }
                    >
                      Decline
                    </Button>
                    {blockButton(person)}
                  </>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Followers</CardTitle>
          <CardDescription>They can see your private registries as well as your public ones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {followers.length === 0 ? (
            <p className="text-sm text-tertiary">
              No followers yet. Share your profile link so people can find you.
            </p>
          ) : (
            followers.map((person) => (
              <PersonRow
                key={person.username}
                person={person}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => {
                        if (
                          !confirm(
                            `Remove @${person.username}? They'll stop seeing your private registries.`,
                          )
                        ) {
                          return;
                        }
                        act(`remove-${person.username}`, () => removeAction(person.username), () =>
                          setFollowers(without(followers, person)),
                        );
                      }}
                    >
                      Remove
                    </Button>
                    {blockButton(person)}
                  </>
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Following</CardTitle>
          <CardDescription>
            People whose registries you follow. See them all on your{" "}
            <Link href="/dashboard/following" className="font-medium text-brand-600 hover:underline">
              Following page
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {following.length === 0 ? (
            <p className="text-sm text-tertiary">
              You&apos;re not following anyone yet. Find people on your{" "}
              <Link href="/dashboard/following" className="font-medium text-brand-600 hover:underline">
                Following page
              </Link>
              , or open someone&apos;s profile link and tap Follow.
            </p>
          ) : (
            following.map((person) => (
              <PersonRow
                key={person.username}
                person={person}
                actions={
                  <>
                    {person.status === "pending" && (
                      <span className="self-center text-sm text-tertiary">Requested</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => {
                        const question =
                          person.status === "pending"
                            ? `Withdraw your request to follow @${person.username}?`
                            : `Unfollow @${person.username}? You'll stop seeing their private registries.`;
                        if (!confirm(question)) return;
                        act(`cancel-${person.username}`, () => cancelAction(person.username), () =>
                          setFollowing(without(following, person)),
                        );
                      }}
                    >
                      {person.status === "pending" ? "Withdraw" : "Unfollow"}
                    </Button>
                  </>
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {blocked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Blocked</CardTitle>
            <CardDescription>
              They can&apos;t ask to follow you or find you in search, and your profile is hidden from
              them while they&apos;re signed in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocked.map((person) => (
              <PersonRow
                key={person.username}
                person={person}
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() =>
                      act(`unblock-${person.username}`, () => unblockAction(person.username), () =>
                        setBlocked(without(blocked, person)),
                      )
                    }
                  >
                    Unblock
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-error-primary">{error}</p>}
    </>
  );
}
