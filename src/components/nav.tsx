import { NavBar, type NavAccount } from "@/components/nav-bar";
import { countFollowRequests } from "@/lib/follows";
import { profilePath } from "@/lib/profile-link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer } from "@/lib/viewer";

// Rendered on the server, so the account side of the bar arrives with the page
// instead of popping in after it loads.
export async function Nav() {
  const viewer = await getViewer();

  let account: NavAccount | null = null;
  if (viewer) {
    const [{ data: profile }, followRequestCount] = await Promise.all([
      supabaseAdmin.from("profiles").select("public_id, full_name").eq("id", viewer.id).single(),
      countFollowRequests(viewer.id),
    ]);

    account = {
      name: profile?.full_name?.trim() || viewer.email || "Your account",
      profilePath: profile ? profilePath(profile) : "/dashboard/account",
      email: viewer.email ?? null,
      followRequestCount,
    };
  }

  return <NavBar account={account} />;
}
