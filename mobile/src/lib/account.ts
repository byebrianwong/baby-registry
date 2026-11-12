// Deleting the account from the app, which Apple requires of apps that make
// accounts. The website's server does the work (src/app/api/account/route.ts):
// it needs the service-role key, which the app doesn't have. The app sends
// its session's access token, so the server only ever deletes this account.

import { useState } from "react";
import { Alert, Platform } from "react-native";

import { accountDeletionLines, type AccountDeletionSummary } from "@shared/account-deletion-summary";

import { haptic } from "@/components/ui";
import { signOut, useSession } from "@/lib/auth";
import { clearCache } from "@/lib/query";
import { SITE_URL, supabase } from "@/lib/supabase";

async function callAccountApi(method: "GET" | "DELETE") {
  // getSession refreshes the token first if it has run out.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign out, sign in again, then try again.");

  let response: Response;
  try {
    response = await fetch(`${SITE_URL}/api/account`, { method, headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error("We couldn't reach Regibee. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Try again.");
  return body;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

function tell(title: string, text: string) {
  if (Platform.OS === "web") globalThis.alert?.(`${title}\n\n${text}`);
  else Alert.alert(title, text);
}

function confirmDeletion(text: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`Delete your account?\n\n${text}`)) onConfirm();
    return;
  }
  Alert.alert("Delete your account?", text, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete account", style: "destructive", onPress: onConfirm },
  ]);
}

/**
 * The Account tab's "Delete account" row. It asks the server what deleting
 * the account would do, shows that in a confirmation, then deletes the
 * account, clears the cache and signs out.
 */
export function useDeleteAccount() {
  const { demo } = useSession();
  // What the row is waiting for, if anything.
  const [status, setStatus] = useState<"checking" | "deleting" | null>(null);

  async function start() {
    if (status) return;
    if (demo) {
      tell(
        "There's no account to delete",
        "This is the demo. It doesn't have an account, and nothing in it is saved. If you make an account, you can delete it here.",
      );
      return;
    }

    setStatus("checking");
    let summary: AccountDeletionSummary;
    try {
      summary = await callAccountApi("GET");
    } catch (error) {
      setStatus(null);
      tell("We couldn't check your account", message(error));
      return;
    }
    setStatus(null);

    haptic("warning");
    const text = [...accountDeletionLines(summary), "This can't be undone."].join("\n\n");
    confirmDeletion(text, async () => {
      setStatus("deleting");
      try {
        await callAccountApi("DELETE");
      } catch (error) {
        setStatus(null);
        tell("Your account wasn't deleted", message(error));
        return;
      }
      // The account and its sessions are gone on the server. These clear the
      // phone's copies. Signing out shows the sign-in screen.
      await clearCache();
      await signOut();
      haptic("success");
      tell("Your account is deleted", "Thanks for using Regibee.");
    });
  }

  return { status, start };
}
