import { redirect } from "next/navigation";
import { FollowingFeed } from "@/components/following-feed";
import { listFollowingFeed } from "@/lib/follows";
import { listUpcomingBirthdays } from "@/lib/birthdays-server";
import { listRegistriesSharedWithViewer } from "@/lib/groups-server";
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

  const today = new Date().toISOString().slice(0, 10);
  const [feed, shared, birthdays] = await Promise.all([
    listFollowingFeed(user.id),
    // An email counts for group membership only once it's confirmed.
    listRegistriesSharedWithViewer({ id: user.id, email: user.email_confirmed_at ? user.email : null }),
    listUpcomingBirthdays(user.id, today),
  ]);

  return (
    <FollowingFeed
      people={feed.people}
      registries={feed.registries}
      shared={shared}
      birthdays={birthdays}
      today={today}
    />
  );
}
