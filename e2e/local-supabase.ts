// Where the local Supabase stack is, from `supabase status`. Refuses any
// address that isn't on this computer, so the tests can never write to the
// production database or send real email.

import { execFileSync } from "node:child_process";
import path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "..");

export interface LocalSupabase {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  /** Mailpit, the inbox that catches every email in the tests. */
  mailpitUrl: string;
}

function isLocal(url: string): boolean {
  try {
    return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

let cached: LocalSupabase | undefined;

export function localSupabase(): LocalSupabase {
  if (cached) return cached;

  let output: string;
  try {
    output = execFileSync("supabase", ["status", "-o", "env"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error("Local Supabase isn't running. Start it with: npm run e2e:db");
  }

  const vars: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (match) vars[match[1]] = match[2];
  }

  const found = {
    apiUrl: vars.API_URL,
    anonKey: vars.ANON_KEY,
    serviceRoleKey: vars.SERVICE_ROLE_KEY,
    mailpitUrl: vars.MAILPIT_URL || vars.INBUCKET_URL,
  };
  for (const [name, value] of Object.entries(found)) {
    if (!value) throw new Error(`supabase status didn't give ${name}. Is the local stack running?`);
  }
  if (!isLocal(found.apiUrl) || !isLocal(found.mailpitUrl)) {
    throw new Error(`Refusing to test against ${found.apiUrl}: it isn't on this computer.`);
  }

  cached = found;
  return found;
}
