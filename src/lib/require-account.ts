import { createClient } from "@/utils/supabase/server";

// Guests get an anonymous Supabase session when they reserve a gift, so having
// a user isn't the same as having an account.
export async function requireAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    return { user: null, supabase, error: "You need an account to do this." } as const;
  }

  return { user, supabase, error: null } as const;
}
