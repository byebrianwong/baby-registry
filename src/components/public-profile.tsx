import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileRegistryCard } from "@/components/profile-registry-card";
import { PandaMark } from "@/components/panda-mark";
import { initialsFor } from "@/lib/initials";
import {
  isPastEvent,
  sortListedRegistries,
  type ListedRegistry,
} from "@/lib/registry-listing";

export function PublicProfile({
  username,
  fullName,
  registries,
  today,
  isOwnProfile = false,
  followAction,
}: {
  username: string;
  fullName: string | null;
  registries: ListedRegistry[];
  today: string;
  isOwnProfile?: boolean;
  followAction?: React.ReactNode;
}) {
  const displayName = fullName?.trim() || `@${username}`;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-20">
          <AvatarFallback className="text-2xl font-medium">
            {initialsFor(fullName?.trim() || username)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 max-w-full">
          <h1 className="break-words text-2xl font-bold">{displayName}</h1>
          <p className="break-words text-tertiary">@{username}</p>
        </div>
        {isOwnProfile ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/account">Edit profile</Link>
          </Button>
        ) : (
          followAction
        )}
      </div>

      {registries.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-secondary px-4 py-12 text-center">
          <PandaMark className="h-16 w-auto" />
          <p className="mt-3 text-tertiary">No registries to show yet.</p>
          {isOwnProfile && (
            <Link
              href="/dashboard/account"
              className="mt-2 text-sm font-medium text-brand-600 hover:underline"
            >
              Choose which registries to show
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Registries</h2>
          <div className="mt-3 flex flex-col gap-3">
            {sortListedRegistries(registries, today).map((registry) => (
              <ProfileRegistryCard
                key={registry.slug}
                registry={registry}
                isPast={isPastEvent(registry, today)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
