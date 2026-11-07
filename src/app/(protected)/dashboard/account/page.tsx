import { redirect } from "next/navigation";
import { AccountSettings, type AccountRegistry } from "@/components/account-settings";
import { listFollows } from "@/lib/follows";
import { createClient } from "@/utils/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Guests have anonymous sessions, which get past the /dashboard middleware
  // check, but only real accounts can have a public profile.
  if (user.is_anonymous) {
    redirect("/signup?redirect=/dashboard/account");
  }

  const [{ data: profile }, { data: registries }, follows] = await Promise.all([
    supabase.from("profiles").select("username, full_name").eq("id", user.id).single(),
    supabase
      .from("registries")
      .select("id, title, is_public, listed_on_profile, registry_type, event_type, settings")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    listFollows(user.id),
  ]);

  const accountRegistries: AccountRegistry[] = (registries || []).map(
    ({ settings, ...registry }) => ({
      ...registry,
      has_shipping_address: Boolean(settings?.shipping_address),
    }),
  );

  return (
    <AccountSettings
      profile={{
        username: profile?.username ?? null,
        full_name: profile?.full_name ?? null,
      }}
      registries={accountRegistries}
      follows={follows}
    />
  );
}
