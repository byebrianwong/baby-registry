// Calls to Regibee's extension API (src/app/api/extension). Only the
// background worker uses this, so one place refreshes the session.

import type { ExtensionSession } from "@/lib/extension";
import { REGIBEE_URL } from "./config";
import { clearAccount, load, save } from "./storage";

export class NotConnectedError extends Error {
  constructor() {
    super("The extension isn't connected to Regibee.");
  }
}

// Refresh a minute early, so a request never goes out with a token that's about to lapse.
const REFRESH_MARGIN_MS = 60_000;

let refreshing: Promise<ExtensionSession | null> | null = null;

async function refresh(): Promise<ExtensionSession | null> {
  // One refresh at a time: Supabase rotates refresh tokens, so two refreshes
  // with the same token could end the session.
  refreshing ??= (async () => {
    try {
      const { session } = await load("session");
      if (!session) return null;
      const response = await fetch(`${REGIBEE_URL}/api/extension/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (response.status === 401 || response.status === 400) {
        await clearAccount();
        return null;
      }
      if (!response.ok) throw new Error(`Regibee answered ${response.status}.`);
      const next = (await response.json()) as ExtensionSession;
      await save({ session: next });
      return next;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function accessToken(force = false): Promise<string> {
  const { session } = await load("session");
  if (!session) throw new NotConnectedError();
  if (!force && session.expires_at * 1000 - Date.now() > REFRESH_MARGIN_MS) {
    return session.access_token;
  }
  const next = await refresh();
  if (!next) throw new NotConnectedError();
  return next.access_token;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const send = (token: string) =>
    fetch(`${REGIBEE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

  let response = await send(await accessToken());
  if (response.status === 401) {
    // The token may have been revoked or expired early. Try one refresh.
    response = await send(await accessToken(true));
    if (response.status === 401) {
      await clearAccount();
      throw new NotConnectedError();
    }
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Regibee answered ${response.status}.`);
  }
  return (await response.json()) as T;
}
