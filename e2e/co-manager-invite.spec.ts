// A co-manager invite link. A guest who reserved a gift has an anonymous
// session, which isn't an account, so they're asked to sign in and can't
// accept. Someone who signs in from the same page can.

import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createAccount, createRegistryWithItem, db, reserveGift, uniqueEmail } from "./fixtures";
import { localSupabase } from "./local-supabase";

// A field typed into before React takes over the page is cleared on React's
// next render, and on a cold dev server that can take a few seconds. React
// tags each element it manages with a "__reactProps" key, so wait for that.
async function waitForReact(page: Page, selector: string) {
  await page.waitForFunction((s) => {
    const element = document.querySelector(s);
    return !!element && Object.keys(element).some((key) => key.startsWith("__reactProps"));
  }, selector);
}

async function managersOf(registryId: string) {
  const { data, error } = await db.from("registry_managers").select("user_id, role").eq("registry_id", registryId);
  if (error) throw error;
  return data;
}

test("a guest can't accept a co-manager invite, and an account that signs in from it can", async ({ page }) => {
  const { owner, registry } = await createRegistryWithItem();
  const token = randomBytes(24).toString("hex");
  const { error: inviteError } = await db
    .from("registry_invites")
    .insert({ registry_id: registry.id, invited_by: owner.id, token, max_uses: null });
  if (inviteError) throw inviteError;
  const invitePath = `/invite/${token}`;

  // Reserving a gift gives this browser a guest's anonymous session.
  await reserveGift(page, { slug: registry.slug, name: "Glinda Guest", email: uniqueEmail("guest") });

  // The invite page treats the guest as signed out.
  await page.goto(invitePath);
  await expect(page.getByText("Sign in or create an account to accept this invitation.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Account" })).toHaveAttribute(
    "href",
    `/signup?redirect=${encodeURIComponent(invitePath)}`,
  );
  await expect(page.getByRole("button", { name: "Accept Invitation" })).toHaveCount(0);

  // A guest's session can't accept it by calling the database function
  // straight through the Data API either.
  const guest = createClient(localSupabase().apiUrl, localSupabase().anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonymous, error: anonymousError } = await guest.auth.signInAnonymously();
  if (anonymousError || !anonymous.user) throw anonymousError ?? new Error("No anonymous user");
  const { error: rpcError } = await guest.rpc("accept_registry_invite", {
    p_token: token,
    p_user_id: anonymous.user.id,
  });
  expect(rpcError?.message).toBe("Sign in or create an account to accept this invite");
  expect(await managersOf(registry.id)).toEqual([{ user_id: owner.id, role: "owner" }]);

  // Someone with an account signs in from the invite page, comes back to it,
  // and accepts.
  const account = await createAccount("Casey Comanager");
  await page.getByRole("link", { name: "Sign In" }).click();
  await page.waitForURL(/\/login\?redirect=/);
  await waitForReact(page, "form");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`**${invitePath}`);
  await page.getByRole("button", { name: "Accept Invitation" }).click();
  await page.waitForURL(/\/dashboard/);

  expect(await managersOf(registry.id)).toEqual(
    expect.arrayContaining([
      { user_id: owner.id, role: "owner" },
      { user_id: account.id, role: "manager" },
    ]),
  );
  expect(await managersOf(registry.id)).toHaveLength(2);
});
