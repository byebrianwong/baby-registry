"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FollowBackButton, MutualBadge } from "@/components/follow-button";
import {
  approveFollower,
  blockUser,
  cancelFollow,
  removeFollower,
  requestFollow,
  unblockUser,
} from "@/lib/actions/follows";
import type { FollowPerson, PersonSummary } from "@/lib/follows";
import { displayName, profilePath } from "@/lib/profile-link";

function PersonLabel({ person, basePath }: { person: PersonSummary; basePath: string }) {
  return (
    <Link
      href={`${basePath}${profilePath(person)}`}
      className="min-w-0 break-words text-sm font-medium text-primary hover:underline"
    >
      {displayName(person)}
    </Link>
  );
}

function PersonRow({
  person,
  actions,
  basePath,
  mutual = false,
}: {
  person: PersonSummary;
  actions: React.ReactNode;
  basePath: string;
  /** The account and this person follow each other. */
  mutual?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* At least 8rem, so on a narrow screen the buttons wrap under the name
          instead of squeezing it. */}
      <div className="flex min-w-0 grow basis-32 flex-wrap items-center gap-x-2 gap-y-1">
        <PersonLabel person={person} basePath={basePath} />
        {mutual && <MutualBadge />}
      </div>
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
  followAction = requestFollow,
  basePath = "",
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
  /** Follows someone back. */
  followAction?: typeof requestFollow;
  /** Put in front of every link. The demo passes "/demo". */
  basePath?: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [followers, setFollowers] = useState(initialFollowers);
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);
  // Requests approved on this page. They stay in the requests card with a
  // Follow back button, since that's where the approver is looking.
  const [justApproved, setJustApproved] = useState<FollowPerson[]>([]);
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
    list.filter((p) => p.public_id !== person.public_id);

  const block = (person: PersonSummary) => {
    if (
      !confirm(
        `Block ${displayName(person)}? They'll be removed from your followers and the people you follow, and won't be able to ask to follow you.`,
      )
    ) {
      return;
    }
    act(`block-${person.public_id}`, () => blockAction(person.public_id), () => {
      setRequests((list) => without(list, person));
      setJustApproved((list) => without(list, person));
      setFollowers((list) => without(list, person));
      setFollowing((list) => without(list, person));
      setBlocked((list) => [{ public_id: person.public_id, full_name: person.full_name }, ...without(list, person)]);
    });
  };

  // How the account follows this person: null when it doesn't.
  const followingStatus = (person: PersonSummary) =>
    following.find((p) => p.public_id === person.public_id)?.status ?? null;

  // Both follows approved. `followers` holds only approved follows.
  const isMutual = (person: PersonSummary) =>
    followingStatus(person) === "approved" && followers.some((p) => p.public_id === person.public_id);

  // Keyed by status, so the button starts over when the status changes
  // somewhere else on the page, like after unfollowing.
  const followBack = (person: PersonSummary) => (
    <FollowBackButton
      key={followingStatus(person) ?? "none"}
      publicId={person.public_id}
      name={displayName(person)}
      status={followingStatus(person)}
      requestAction={followAction}
      onFollowed={() =>
        setFollowing((list) => [
          { public_id: person.public_id, full_name: person.full_name, status: "pending" },
          ...without(list, person),
        ])
      }
    />
  );

  const blockButton = (person: PersonSummary) => (
    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => block(person)}>
      Block
    </Button>
  );

  return (
    <>
      {requests.length + justApproved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Follow requests</CardTitle>
            <CardDescription>
              People you approve can see the private registries on your profile, and your birthday.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {justApproved.map((person) => (
              <PersonRow
                basePath={basePath}
                key={person.public_id}
                person={person}
                mutual={isMutual(person)}
                actions={
                  <>
                    <span className="self-center text-sm text-tertiary">Approved</span>
                    {!isMutual(person) && followBack(person)}
                  </>
                }
              />
            ))}
            {requests.map((person) => (
              <PersonRow
                basePath={basePath}
                key={person.public_id}
                person={person}
                actions={
                  <>
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        act(`approve-${person.public_id}`, () => approveAction(person.public_id), () => {
                          setRequests(without(requests, person));
                          setJustApproved((list) => [...list, { ...person, status: "approved" }]);
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
                        act(`decline-${person.public_id}`, () => removeAction(person.public_id), () =>
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
          <CardDescription>
            They can see your private registries and your birthday. Follow them back to see theirs.
            Mutual means you follow each other.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {followers.length === 0 ? (
            <p className="text-sm text-tertiary">
              No followers yet. Share your profile link, or let people find you in search.
            </p>
          ) : (
            followers.map((person) => (
              <PersonRow
                basePath={basePath}
                key={person.public_id}
                person={person}
                mutual={isMutual(person)}
                actions={
                  <>
                    {!isMutual(person) && followBack(person)}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => {
                        if (
                          !confirm(
                            `Remove ${displayName(person)}? They'll stop seeing your private registries and your birthday.`,
                          )
                        ) {
                          return;
                        }
                        act(`remove-${person.public_id}`, () => removeAction(person.public_id), () => {
                          setFollowers(without(followers, person));
                          setJustApproved((list) => without(list, person));
                        });
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
            <Link href={`${basePath}/dashboard/following`} className="font-medium text-brand-600 hover:underline">
              Following page
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {following.length === 0 ? (
            <p className="text-sm text-tertiary">
              You&apos;re not following anyone yet. Find people on your{" "}
              <Link href={`${basePath}/dashboard/following`} className="font-medium text-brand-600 hover:underline">
                Following page
              </Link>
              , or open someone&apos;s profile link and tap Follow.
            </p>
          ) : (
            following.map((person) => (
              <PersonRow
                basePath={basePath}
                key={person.public_id}
                person={person}
                mutual={isMutual(person)}
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
                            ? `Withdraw your request to follow ${displayName(person)}?`
                            : `Unfollow ${displayName(person)}? You'll stop seeing their private registries.`;
                        if (!confirm(question)) return;
                        act(`cancel-${person.public_id}`, () => cancelAction(person.public_id), () =>
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
                basePath={basePath}
                key={person.public_id}
                person={person}
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() =>
                      act(`unblock-${person.public_id}`, () => unblockAction(person.public_id), () =>
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
