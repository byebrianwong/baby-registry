import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { FollowButton, type FollowButtonState } from "@/components/follow-button";
import { PublicProfile } from "@/components/public-profile";
import { getFollowStatus } from "@/lib/follows";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  LISTED_REGISTRY_COLUMNS,
  type ListedRegistry,
} from "@/lib/registry-listing";
import { isValidUsernameFormat } from "@/lib/username";
import { createClient } from "@/utils/supabase/server";

// `profiles` is only readable by its owner, so this reads with the service-role
// client, always filtered by the username in the URL. Rows with no username
// never match, which keeps guests and people who haven't opted in out of reach.
const getProfile = cache(async (rawUsername: string) => {
  const username = rawUsername.toLowerCase();
  if (!isValidUsernameFormat(username)) return null;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name")
    .eq("username", username)
    .maybeSingle();

  return data as { id: string; username: string; full_name: string | null } | null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) return { title: "Profile Not Found" };

  const name = profile.full_name?.trim() || `@${profile.username}`;
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
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Guests have anonymous sessions; they count as signed out here.
  const viewer = user && !user.is_anonymous ? user : null;
  const isOwnProfile = viewer?.id === profile.id;

  let followState: FollowButtonState = "signed-out";
  if (viewer && !isOwnProfile) {
    const [{ data: viewerProfile }, status] = await Promise.all([
      supabaseAdmin.from("profiles").select("username").eq("id", viewer.id).single(),
      getFollowStatus(viewer.id, profile.id),
    ]);
    followState = status ?? (viewerProfile?.username ? "none" : "needs-profile");
  }

  // Private registries are only for the owner and approved followers.
  let registriesQuery = supabaseAdmin
    .from("registries")
    .select(LISTED_REGISTRY_COLUMNS)
    .eq("owner_id", profile.id)
    .eq("listed_on_profile", true);
  if (!isOwnProfile && followState !== "approved") {
    registriesQuery = registriesQuery.eq("is_public", true);
  }
  const { data: registries } = await registriesQuery;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <PublicProfile
          username={profile.username}
          fullName={profile.full_name}
          registries={(registries || []) as ListedRegistry[]}
          today={new Date().toISOString().slice(0, 10)}
          isOwnProfile={isOwnProfile}
          followAction={<FollowButton username={profile.username} state={followState} />}
        />
      </main>
      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-tertiary">
          Powered by{" "}
          <Link href="/" className="font-medium text-brand-600 hover:underline">
            Regibee
          </Link>
        </div>
      </footer>
    </div>
  );
}
