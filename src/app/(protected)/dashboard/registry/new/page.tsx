import { redirect } from "next/navigation";
import { CreateRegistryForm } from "@/components/create-registry-form";
import { createClient } from "@/utils/supabase/server";

export default async function NewRegistryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return <CreateRegistryForm username={profile?.username ?? null} />;
}
