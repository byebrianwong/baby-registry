// Server-only helpers for the browser extension's API (src/app/api/extension).
//
// The extension signs in with its own Supabase session, which the Connect
// page (src/app/extension/connect) creates. It sends the session's access
// token as "Authorization: Bearer <token>". Requests then run as that user,
// under the same access rules (RLS) as the website.

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ExtensionSession } from "@/lib/extension";

function anonClient(accessToken?: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

type ExtensionAuth =
  | { user: User; supabase: SupabaseClient; accessToken: string; response?: undefined }
  | { response: NextResponse; user?: undefined; supabase?: undefined; accessToken?: undefined };

/** The signed-in user behind an extension request, or a 401 response. */
export async function authenticateExtension(request: Request): Promise<ExtensionAuth> {
  const header = request.headers.get("authorization") ?? "";
  const accessToken = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!accessToken) return { response: jsonError("Not connected", 401) };

  const supabase = anonClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  // Guests get anonymous sessions when they reserve a gift. Those aren't accounts.
  if (error || !user || user.is_anonymous) return { response: jsonError("Not connected", 401) };

  return { user, supabase, accessToken };
}

/** Ids of the registries the user owns or manages. */
export async function managedRegistryIds(userId: string): Promise<string[]> {
  const [{ data: managed }, { data: owned }] = await Promise.all([
    supabaseAdmin.from("registry_managers").select("registry_id").eq("user_id", userId),
    supabaseAdmin.from("registries").select("id").eq("owner_id", userId),
  ]);
  const ids = new Set<string>();
  for (const row of managed ?? []) ids.add(row.registry_id as string);
  for (const row of owned ?? []) ids.add(row.id as string);
  return [...ids];
}

export async function isRegistryManager(userId: string, registryId: string): Promise<boolean> {
  return (await managedRegistryIds(userId)).includes(registryId);
}

/**
 * Starts a new session for the extension, separate from the website's. The
 * site's refresh token can't be shared: Supabase rotates refresh tokens, and
 * two holders of one would sign each other out.
 *
 * Supabase has no admin call that creates a session, so this makes a one-time
 * sign-in link without sending it and redeems it on the server.
 */
export async function createExtensionSession(
  user: User
): Promise<{ session: ExtensionSession; error?: undefined } | { error: string; session?: undefined }> {
  if (!user.email) {
    return { error: "Your account needs an email address to connect the extension." };
  }
  // For an unconfirmed account Supabase would make a sign-up link instead,
  // and redeeming that would confirm an email address nobody has proved they own.
  if (!user.email_confirmed_at) {
    return { error: "Confirm your email address first, then connect the extension." };
  }

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash || link.properties.verification_type !== "magiclink") {
    return { error: "We couldn't connect the extension. Try again." };
  }

  const { data, error } = await anonClient().auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  const session = data?.session;
  if (error || !session || data.user?.id !== user.id) {
    return { error: "We couldn't connect the extension. Try again." };
  }

  return {
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    },
  };
}

/** Swaps the extension's refresh token for a new session. */
export async function refreshExtensionSession(refreshToken: string): Promise<ExtensionSession | null> {
  const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken });
  const session = data?.session;
  if (error || !session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
  };
}

/** Ends the extension's session. The website's sessions stay signed in. */
export async function endExtensionSession(accessToken: string): Promise<void> {
  await supabaseAdmin.auth.admin.signOut(accessToken, "local");
}

/** Reads a JSON body, or null when it isn't JSON. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
