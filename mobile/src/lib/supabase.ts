// The app talks to Supabase directly as the signed-in user, under the same
// access rules (RLS) as the website. It uses only the public anon key; the
// service-role key never leaves the website's server.

import { kvStorage } from "@/lib/kv-storage";

import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set. See mobile/README.md."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: kvStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in front.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** The website, for pages the app links to (the guest view, settings it doesn't have). */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://www.regibee.com").replace(/\/$/, "");

export function registryShareUrl(slug: string) {
  return `${SITE_URL}/r/${slug}`;
}
