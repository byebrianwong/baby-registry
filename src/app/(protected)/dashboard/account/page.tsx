import { redirect } from "next/navigation";
import { AccountSettings, type AccountRegistry } from "@/components/account-settings";
import { listFollows } from "@/lib/follows";
import { getSessionUser } from "@/lib/viewer";
import { createClient } from "@/utils/supabase/server";

export default async function AccountPage() {
  const [supabase, user] = await Promise.all([createClient(), getSessionUser()]);

  if (!user) {
    redirect("/login");
  }

  // Guests have anonymous sessions, which get past the /dashboard middleware
  // check, but only real accounts have a profile.
  if (user.is_anonymous) {
    redirect("/signup?redirect=/dashboard/account");
  }

  const [{ data: profile }, { data: registries }, follows] = await Promise.all([
    supabase
      .from("profiles")
      .select("public_id, full_name, discoverable, findable_by_email, email_follow_requests")
      .eq("id", user.id)
      .single(),
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
        public_id: profile?.public_id ?? "",
        full_name: profile?.full_name ?? null,
        discoverable: profile?.discoverable ?? false,
        findable_by_email: profile?.findable_by_email ?? false,
        email_follow_requests: profile?.email_follow_requests ?? true,
      }}
      registries={accountRegistries}
      follows={follows}
    />
  );
}
