import { redirect } from "next/navigation";
import { FollowingFeed } from "@/components/following-feed";
import { listFollowingFeed } from "@/lib/follows";
import { getSessionUser } from "@/lib/viewer";

export default async function FollowingPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Guests have anonymous sessions, which get past the /dashboard middleware
  // check, but only real accounts can follow people.
  if (user.is_anonymous) {
    redirect("/signup?redirect=/dashboard/following");
  }

  const feed = await listFollowingFeed(user.id);

  return (
    <FollowingFeed
      people={feed.people}
      registries={feed.registries}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
