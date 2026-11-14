"use client";

import { FollowingFeed } from "@/components/following-feed";
import { DEMO_FOLLOWS, demoOk, demoSearchPeople, demoUpcomingBirthdays } from "@/lib/demo-people";
import { demoFeedRegistries } from "@/lib/demo-registries";
import { useDemoToday } from "../../demo-today";
import { DemoOwnerShell } from "../../_components/demo-shell";

/** The demo's Following tab. Like src/app/(protected)/dashboard/(tabs)/following/page.tsx. */
export default function DemoFollowingPage() {
  const today = useDemoToday();
  const approvedIds = DEMO_FOLLOWS.following.filter((p) => p.status === "approved").map((p) => p.public_id);
  // Marks the people who follow the demo account back, as listFollowingFeed does.
  const people = DEMO_FOLLOWS.following.map((person) => ({
    ...person,
    mutual:
      person.status === "approved" && DEMO_FOLLOWS.followers.some((f) => f.public_id === person.public_id),
  }));

  return (
    <DemoOwnerShell tabs>
      <FollowingFeed
        people={people}
        registries={demoFeedRegistries(today, approvedIds)}
        birthdays={demoUpcomingBirthdays(today)}
        today={today}
        searchAction={demoSearchPeople}
        inviteAction={demoOk}
        followActions={{ requestAction: demoOk, cancelAction: demoOk }}
        basePath="/demo"
      />
    </DemoOwnerShell>
  );
}
