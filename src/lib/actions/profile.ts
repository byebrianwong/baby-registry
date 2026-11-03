"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeUsername, usernameProblem } from "@/lib/username";

const MAX_NAME_LENGTH = 80;
const POSTGRES_UNIQUE_VIOLATION = "23505";

// Guests get an anonymous Supabase session when they reserve a gift, so having
// a user isn't the same as having an account.
async function requireAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return { user: null, supabase, error: "You need an account to do this." } as const;
  }

  return { user, supabase, error: null } as const;
}

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

  // Signed-in sessions can't write usernames directly (see
  // 011_public_profiles.sql), so this goes through the service role.
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: fullName, username })
    .eq("id", user.id);

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
    .eq("is_public", true)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Only public registries you own can be shown on your profile." };
  }

  revalidateProfilePages();
  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}
