"use client";

import { FollowingFeed } from "@/components/following-feed";
import { DEMO_FOLLOWS, demoOk, demoSearchPeople } from "@/lib/demo-people";
import { demoFeedRegistries } from "@/lib/demo-registries";
import { useDemoToday } from "../../demo-today";
import { DemoOwnerShell } from "../../_components/demo-shell";

/** The demo's Following tab. Like src/app/(protected)/dashboard/(tabs)/following/page.tsx. */
export default function DemoFollowingPage() {
  const today = useDemoToday();
  const approvedIds = DEMO_FOLLOWS.following.filter((p) => p.status === "approved").map((p) => p.public_id);

  return (
    <DemoOwnerShell tabs>
      <FollowingFeed
        people={DEMO_FOLLOWS.following}
        registries={demoFeedRegistries(today, approvedIds)}
        today={today}
        searchAction={demoSearchPeople}
        inviteAction={demoOk}
        followActions={{ requestAction: demoOk, cancelAction: demoOk }}
        basePath="/demo"
      />
    </DemoOwnerShell>
  );
}
