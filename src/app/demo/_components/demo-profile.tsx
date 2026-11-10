"use client";

import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { PublicProfile } from "@/components/public-profile";
import { demoFollowState, demoOk, demoProfilePath, findDemoPerson } from "@/lib/demo-people";
import { demoProfileRegistries } from "@/lib/demo-registries";
import { publicIdFromPath } from "@/lib/profile-link";
import { useDemoToday } from "../demo-today";
import { DemoOwnerShell } from "./demo-shell";

/**
 * Someone's profile, as Remi & Max see it. Like src/app/u/[profile]/page.tsx:
 * private registries show only on their own profile and to approved followers.
 */
export function DemoProfile({ segment }: { segment: string }) {
  const today = useDemoToday();
  const publicId = publicIdFromPath(segment);
  const person = publicId ? findDemoPerson(publicId) : null;
  if (!person) notFound();

  const state = demoFollowState(person.public_id);
  const isOwnProfile = state === "self";

  return (
    <DemoOwnerShell>
      <PublicProfile
        fullName={person.full_name}
        registries={demoProfileRegistries(today, person, isOwnProfile || state === "approved")}
        today={today}
        isOwnProfile={isOwnProfile}
        basePath="/demo"
        followAction={
          isOwnProfile ? null : (
            <FollowButton
              publicId={person.public_id}
              name={person.full_name}
              state={state}
              returnTo={demoProfilePath(person)}
              requestAction={demoOk}
              cancelAction={demoOk}
              basePath="/demo"
            />
          )
        }
      />
    </DemoOwnerShell>
  );
}
