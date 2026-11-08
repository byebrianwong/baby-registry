"use server";

import { requireAccount } from "@/lib/require-account";
import { createExtensionSession } from "@/lib/extension-server";

/**
 * Starts the browser extension's own session for the signed-in account. The
 * Connect page hands it straight to the extension.
 */
export async function connectExtension() {
  const { user, error } = await requireAccount();
  if (error || !user) return { error: error ?? "You need an account to do this." };
  return createExtensionSession(user);
}
