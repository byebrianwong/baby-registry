// End-to-end tests: the website against the local Supabase stack, with every
// email caught by its Mailpit inbox. See e2e/README.md.

import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { localSupabase, REPO_ROOT } from "./local-supabase";
import { CRON_SECRET, SITE_URL } from "./fixtures";

const supabase = localSupabase();

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  outputDir: path.join(REPO_ROOT, "test-results", "e2e"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: SITE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev --port 3100",
    cwd: REPO_ROOT,
    url: SITE_URL,
    // Never reuse a server already on the port: it may use production.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SITE_URL: SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
      EMAIL_TRANSPORT: "mailpit",
      MAILPIT_URL: supabase.mailpitUrl,
      CRON_SECRET,
      // Blank, so the values in .env.local don't apply. With no key, Resend
      // can't send even if something skipped Mailpit.
      RESEND_API_KEY: "",
      RESEND_TEST_RECIPIENT: "",
    },
  },
});
