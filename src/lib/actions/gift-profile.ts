"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/extension";
import { parseGiftProfile } from "@/lib/gift-profile";
import { requireAccount } from "@/lib/require-account";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Signed-in sessions can update only full_name and avatar_url on profiles
// (011_public_profiles.sql), so these write with the service-role client
// after requireAccount, which refuses guests' anonymous sessions.

const SAVE_FAILED = "We couldn't save that. Try again in a moment.";

/** Saves the signed-in person's own gift profile. */
export async function saveGiftProfile(input: unknown) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ gift_profile: parseGiftProfile(input) })
    .eq("id", user.id);
  if (error) {
    console.error("[gift profile] Failed to save:", error);
    return { error: SAVE_FAILED };
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/following");
  revalidatePath("/u/[profile]", "page");
  revalidatePath("/r/[slug]", "page");
  return { success: true };
}

/** The Account page switch for emails before followed people's birthdays. */
export async function setBirthdayEmails(on: boolean) {
  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ email_birthday_reminders: on === true })
    .eq("id", user.id);
  if (error) {
    console.error("[gift profile] Failed to save birthday emails:", error);
    return { error: SAVE_FAILED };
  }

  revalidatePath("/dashboard/account");
  return { success: true };
}

/** Whether this account owns or helps manage the list. */
async function managesList(registryId: string, userId: string) {
  const [{ data: manager }, { data: registry }] = await Promise.all([
    supabaseAdmin
      .from("registry_managers")
      .select("role")
      .eq("registry_id", registryId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin.from("registries").select("owner_id").eq("id", registryId).maybeSingle(),
  ]);
  return Boolean(manager) || registry?.owner_id === userId;
}

/**
 * Saves the gift profile of a list kept for a child, in the list's
 * settings.gift_profile. Anyone who manages the list can change it.
 */
export async function saveListGiftProfile(registryId: string, input: unknown) {
  if (!isUuid(registryId)) return { error: "We couldn't find that list." };

  const { user, error: authError } = await requireAccount();
  if (!user) return { error: authError };

  if (!(await managesList(registryId, user.id))) {
    return { error: "Only people who manage this list can change it." };
  }

  const { data: registry, error: readError } = await supabaseAdmin
    .from("registries")
    .select("slug, registry_type, settings")
    .eq("id", registryId)
    .maybeSingle();
  if (readError) {
    console.error("[gift profile] Failed to read the list:", readError);
    return { error: SAVE_FAILED };
  }
  if (!registry) return { error: "We couldn't find that list." };
  if (registry.registry_type !== "personal") {
    return { error: "Only wish lists can have a gift profile." };
  }

  const settings = { ...((registry.settings as Record<string, unknown> | null) ?? {}) };
  settings.gift_profile = parseGiftProfile(input);

  const { error } = await supabaseAdmin.from("registries").update({ settings }).eq("id", registryId);
  if (error) {
    console.error("[gift profile] Failed to save the list's profile:", error);
    return { error: SAVE_FAILED };
  }

  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  revalidatePath(`/r/${registry.slug}`);
  revalidatePath("/dashboard/following");
  return { success: true };
}
