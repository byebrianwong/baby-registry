import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { FollowButton } from "@/components/follow-button";
import { PublicProfile } from "@/components/public-profile";
import { PoweredByFooter } from "@/components/site-footer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer, getViewerRelation } from "@/lib/viewer";
import { sharedRegistrySlugsFrom } from "@/lib/groups-server";
import {
  LISTED_REGISTRY_COLUMNS,
  type ListedRegistry,
} from "@/lib/registry-listing";
import { displayName, profilePath, publicIdFromPath } from "@/lib/profile-link";

type Profile = { id: string; public_id: string; full_name: string | null };

// Old links used usernames, which had this format (see 011_public_profiles.sql).
const OLD_USERNAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// `profiles` is only readable by its owner, so this reads with the service-role
// client, always filtered by the id in the URL. The id is random, so a profile
// is only reachable by people who were given its link or found it in search.
// Links from before usernames were removed are looked up by username, and the
// page redirects them to the current link.
const getProfile = cache(async (segment: string): Promise<Profile | null> => {
  const value = segment.toLowerCase();
  const columns = "id, public_id, full_name";

  let profile: Profile | null = null;
  const publicId = publicIdFromPath(value);
  if (publicId) {
    const { data } = await supabaseAdmin.from("profiles").select(columns).eq("public_id", publicId).maybeSingle();
    profile = data as Profile | null;
  }
  if (!profile && OLD_USERNAME_PATTERN.test(value)) {
    const { data } = await supabaseAdmin.from("profiles").select(columns).eq("username", value).maybeSingle();
    profile = data as Profile | null;
  }
  if (!profile) return null;

  // Guests have profile rows too, from the anonymous sessions created when
  // someone reserves a gift. They don't get a profile page.
  const { data: account } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (!account?.user || account.user.is_anonymous) return null;

  return profile;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profile: string }>;
}): Promise<Metadata> {
  const { profile: segment } = await params;
  const profile = await getProfile(segment);

  if (!profile) return { title: "Profile Not Found" };
  if ((await getViewerRelation(profile.id)).hidden) return { title: "Profile Not Found" };

  const name = displayName(profile);
  return {
    title: `${name} | Regibee`,
    description: `See ${name}'s registries on Regibee`,
    // Profiles are for sharing by link. Searching someone's name shouldn't
    // bring up their registries.
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile: segment } = await params;
  const profile = await getProfile(segment);

  if (!profile) {
    notFound();
  }

  // Old username links, and links made before a name change.
  const canonicalPath = profilePath(profile);
  if (`/u/${segment}` !== canonicalPath) {
    redirect(canonicalPath);
  }

  // Someone this person blocked doesn't see their profile while signed in.
  const { state: followState, isOwner: isOwnProfile, hidden } = await getViewerRelation(profile.id);
  if (hidden) {
    notFound();
  }

  // Private registries are only for the owner, approved followers, and
  // people in a group the owner shared that registry with (by a confirmed
  // email). Someone who blocked the owner doesn't get the group's lists.
  const seesAllPrivate = isOwnProfile || followState === "approved";
  const viewer = seesAllPrivate || followState === "blocked" ? null : await getViewer();
  const [{ data: listed }, sharedSlugs] = await Promise.all([
    supabaseAdmin
      .from("registries")
      .select(LISTED_REGISTRY_COLUMNS)
      .eq("owner_id", profile.id)
      .eq("listed_on_profile", true),
    viewer
      ? sharedRegistrySlugsFrom(profile.id, { id: viewer.id, email: viewer.email_confirmed_at ? viewer.email : null })
      : Promise.resolve(new Set<string>()),
  ]);
  const registries = ((listed || []) as ListedRegistry[]).filter(
    (registry) => seesAllPrivate || registry.is_public || sharedSlugs.has(registry.slug),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <PublicProfile
          fullName={profile.full_name}
          registries={registries}
          today={new Date().toISOString().slice(0, 10)}
          isOwnProfile={isOwnProfile}
          followAction={
            <FollowButton
              publicId={profile.public_id}
              name={displayName(profile)}
              state={followState}
              returnTo={canonicalPath}
            />
          }
        />
      </main>
      <PoweredByFooter />
    </div>
  );
}
