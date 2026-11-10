import Link from "next/link";
import { PeopleSearch } from "@/components/people-search";
import { ProfileRegistryCard } from "@/components/profile-registry-card";
import { PandaMark } from "@/components/panda-mark";
import type { FollowActions } from "@/components/follow-button";
import type { searchPeople } from "@/lib/actions/follows";
import type { sendFollowInvite } from "@/lib/actions/follow-invites";
import type { FeedRegistry, FollowPerson } from "@/lib/follows";
import { displayName, profilePath } from "@/lib/profile-link";
import { isPastEvent, sortListedRegistries } from "@/lib/registry-listing";

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-secondary px-4 py-12 text-center">
      <PandaMark className="h-16 w-auto" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-tertiary">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function RegistryGroup({
  title,
  registries,
  today,
  basePath,
}: {
  title: string;
  registries: FeedRegistry[];
  today: string;
  basePath: string;
}) {
  if (registries.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {registries.map((registry) => (
          <ProfileRegistryCard
            key={registry.slug}
            registry={registry}
            isPast={isPastEvent(registry, today)}
            ownerName={displayName(registry.owner)}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  );
}

export function FollowingFeed({
  people,
  registries,
  today,
  searchAction,
  inviteAction,
  followActions,
  basePath = "",
}: {
  people: FollowPerson[];
  registries: FeedRegistry[];
  today: string;
  searchAction?: typeof searchPeople;
  inviteAction?: typeof sendFollowInvite;
  /** Stand-ins for the Follow buttons' server actions. The demo passes them. */
  followActions?: FollowActions;
  /** Put in front of every link. The demo passes "/demo". */
  basePath?: string;
}) {
  const sorted = sortListedRegistries(registries, today);
  const upcoming = sorted.filter((r) => r.event_date !== null && !isPastEvent(r, today));
  const anytime = sorted.filter((r) => r.event_date === null);
  const past = sorted.filter((r) => isPastEvent(r, today));
  const approved = people.filter((p) => p.status === "approved");
  const waiting = people.filter((p) => p.status === "pending");

  return (
    // Left-aligned in the page container, so it lines up under the dashboard
    // tabs. The Following tab is the visible title.
    <div className="container mx-auto px-4 pt-6 pb-8">
      <div className="max-w-2xl">
        <h1 className="sr-only">Following</h1>
        <p className="text-tertiary">Registries from people who&apos;ve approved your follow.</p>

        <div className="mt-6">
          <PeopleSearch
            searchAction={searchAction}
            inviteAction={inviteAction}
            followActions={followActions}
            basePath={basePath}
          />
        </div>

        {people.length === 0 ? (
          <EmptyState
            title="You're not following anyone yet"
            body="Search for friends above by name or email, or open their profile link and tap Follow. Once they approve, their registries show up here."
          />
        ) : (
          <>
            {registries.length === 0 ? (
              <EmptyState
                title="No registries yet"
                body={
                  approved.length === 0
                    ? "Their registries will show up here once they approve your follow."
                    : "The people you follow haven't shared any registries on their profiles yet."
                }
              />
            ) : (
              <>
                <RegistryGroup title="Coming up" registries={upcoming} today={today} basePath={basePath} />
                <RegistryGroup title="Anytime" registries={anytime} today={today} basePath={basePath} />
                <RegistryGroup title="Past events" registries={past} today={today} basePath={basePath} />
              </>
            )}

            <section className="mt-10">
              <h2 className="text-lg font-semibold">People you follow</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {[...approved, ...waiting].map((person) => (
                  <li key={person.public_id} className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`${basePath}${profilePath(person)}`} className="font-medium text-primary hover:underline">
                      {displayName(person)}
                    </Link>
                    {person.status === "pending" && (
                      <span className="text-sm text-tertiary">· Waiting for approval</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-tertiary">
                Manage who you follow on your{" "}
                <Link href={`${basePath}/dashboard/account#follows`} className="font-medium text-brand-600 hover:underline">
                  account page
                </Link>
                .
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
