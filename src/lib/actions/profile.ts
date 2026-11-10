"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAccount } from "@/lib/require-account";

const MAX_NAME_LENGTH = 80;

function revalidateProfilePages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/u/[profile]", "page");
}

export async function saveProfile(formData: FormData) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const fullName = ((formData.get("fullName") as string) || "").trim();

  if (!fullName) {
    return { error: "Add the name you'd like people to see." };
  }
  if (fullName.length > MAX_NAME_LENGTH) {
    return { error: `Names can be up to ${MAX_NAME_LENGTH} characters.` };
  }

  const update: Record<string, string | boolean> = { full_name: fullName };
  if (formData.has("discoverable")) {
    update.discoverable = formData.get("discoverable") === "true";
  }
  if (formData.has("findableByEmail")) {
    update.findable_by_email = formData.get("findableByEmail") === "true";
  }
  if (formData.has("emailFollowRequests")) {
    update.email_follow_requests = formData.get("emailFollowRequests") === "true";
  }

  // Signed-in sessions can't write these columns directly (see
  // 011_public_profiles.sql), so this goes through the service role.
  const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: error.message };

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
