import { NavBar, type NavAccount } from "@/components/nav-bar";
import { countFollowRequests } from "@/lib/follows";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer } from "@/lib/viewer";

// Rendered on the server, so the account side of the bar arrives with the page
// instead of popping in after it loads.
export async function Nav() {
  const viewer = await getViewer();

  let account: NavAccount | null = null;
  if (viewer) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name")
      .eq("id", viewer.id)
      .single();

    account = {
      name: profile?.full_name?.trim() || viewer.email || "Your account",
      username: profile?.username ?? null,
      email: viewer.email ?? null,
      followRequestCount: profile?.username ? await countFollowRequests(viewer.id) : 0,
    };
  }

  return <NavBar account={account} />;
}
