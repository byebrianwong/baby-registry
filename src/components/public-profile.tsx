import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileRegistryCard } from "@/components/profile-registry-card";
import { PandaMark } from "@/components/panda-mark";
import { GiftProfileCard } from "@/components/gift-profile-card";
import { hasGiftDetails, type GiftProfile } from "@/lib/gift-profile";
import { initialsFor } from "@/lib/initials";
import { displayName as nameToShow } from "@/lib/profile-link";
import {
  isPastEvent,
  sortListedRegistries,
  type ListedRegistry,
} from "@/lib/registry-listing";

export function PublicProfile({
  fullName,
  registries,
  today,
  isOwnProfile = false,
  followAction,
  giftProfile = {},
  showBirthday = false,
  basePath = "",
}: {
  fullName: string | null;
  registries: ListedRegistry[];
  today: string;
  isOwnProfile?: boolean;
  followAction?: React.ReactNode;
  /** Sizes, likes and the rest, for anyone who opens the profile. */
  giftProfile?: GiftProfile;
  /** Shows the birthday too. Only for the person and the followers they approved. */
  showBirthday?: boolean;
  /** Put in front of every link. The demo passes "/demo". */
  basePath?: string;
}) {
  const displayName = nameToShow({ full_name: fullName });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-20">
          <AvatarFallback className="text-2xl font-medium">
            {initialsFor(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 max-w-full">
          <h1 className="break-words text-2xl font-bold">{displayName}</h1>
        </div>
        {isOwnProfile ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${basePath}/dashboard/account`}>Edit profile</Link>
          </Button>
        ) : (
          followAction
        )}
      </div>

      {hasGiftDetails(giftProfile) || (showBirthday && giftProfile.birthday) ? (
        <GiftProfileCard
          className="mt-8"
          profile={giftProfile}
          name={displayName}
          showBirthday={showBirthday}
          action={
            isOwnProfile && (
              <Link
                href={`${basePath}/dashboard/account#gift-profile`}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Edit
              </Link>
            )
          }
        />
      ) : (
        isOwnProfile && (
          <p className="mt-8 rounded-2xl border border-dashed border-secondary px-4 py-3 text-center text-sm text-tertiary">
            Add your sizes, likes and birthday so people know what to get you.{" "}
            <Link
              href={`${basePath}/dashboard/account#gift-profile`}
              className="font-medium text-brand-600 hover:underline"
            >
              Add a gift profile
            </Link>
          </p>
        )
      )}

      {registries.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-secondary px-4 py-12 text-center">
          <PandaMark className="h-16 w-auto" />
          <p className="mt-3 text-tertiary">No registries to show yet.</p>
          {isOwnProfile && (
            <Link
              href={`${basePath}/dashboard/account`}
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
                basePath={basePath}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
