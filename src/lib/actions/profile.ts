"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";
import { normalizeUsername, usernameProblem } from "@/lib/username";

const MAX_NAME_LENGTH = 80;
const POSTGRES_UNIQUE_VIOLATION = "23505";

function revalidateProfilePages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
}

export async function saveProfile(formData: FormData) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const fullName = ((formData.get("fullName") as string) || "").trim();
  const username = normalizeUsername((formData.get("username") as string) || "");

  if (!fullName) {
    return { error: "Add the name you'd like people to see." };
  }
  if (fullName.length > MAX_NAME_LENGTH) {
    return { error: `Names can be up to ${MAX_NAME_LENGTH} characters.` };
  }

  const problem = usernameProblem(username);
  if (problem) return { error: problem };

  const update: Record<string, string | boolean> = { full_name: fullName, username };
  if (formData.has("discoverable")) {
    update.discoverable = formData.get("discoverable") === "true";
  }
  if (formData.has("emailFollowRequests")) {
    update.email_follow_requests = formData.get("emailFollowRequests") === "true";
  }

  // Signed-in sessions can't write these columns directly (see
  // 011_public_profiles.sql), so this goes through the service role.
  const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", user.id);

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      return { error: "That username is taken." };
    }
    return { error: error.message };
  }

  revalidateProfilePages();
  return { success: true, username };
}

export async function removeProfile() {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  // Clear the username first: it takes the profile page down, so a failure
  // after this point can't leave anything public.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ username: null })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  // Without a username nobody can find the profile, so its follows go too.
  const { error: followsError } = await supabaseAdmin
    .from("follows")
    .delete()
    .or(`follower_id.eq.${user.id},followee_id.eq.${user.id}`);

  if (followsError) return { error: followsError.message };

  const { error: registriesError } = await supabaseAdmin
    .from("registries")
    .update({ listed_on_profile: false })
    .eq("owner_id", user.id)
    .eq("listed_on_profile", true);

  if (registriesError) return { error: registriesError.message };

  revalidateProfilePages();
  return { success: true };
}

export async function setRegistryListed(registryId: string, listed: boolean) {
  const { user, supabase, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const { data, error } = await supabase
    .from("registries")
    .update({ listed_on_profile: listed })
    .eq("id", registryId)
    .eq("owner_id", user.id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Only registries you own can be shown on your profile." };
  }

  revalidateProfilePages();
  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}
