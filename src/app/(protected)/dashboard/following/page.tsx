import { redirect } from "next/navigation";
import { FollowingFeed } from "@/components/following-feed";
import { listFollowingFeed } from "@/lib/follows";
import { createClient } from "@/utils/supabase/server";

export default async function FollowingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Guests have anonymous sessions, which get past the /dashboard middleware
  // check, but only real accounts can follow people.
  if (user.is_anonymous) {
    redirect("/signup?redirect=/dashboard/following");
  }

  const [{ data: profile }, feed] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    listFollowingFeed(user.id),
  ]);

  return (
    <FollowingFeed
      hasUsername={Boolean(profile?.username)}
      people={feed.people}
      registries={feed.registries}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}
