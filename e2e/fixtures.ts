// Test data, written straight to the local database with the service-role
// key. Every name, email and slug is new, so tests don't depend on each other
// or on a fresh database.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { localSupabase } from "./local-supabase";

export const SITE_URL = "http://localhost:3100";
export const CRON_SECRET = "e2e-cron-secret";

export const db = createClient(localSupabase().apiUrl, localSupabase().serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function uniqueId(): string {
  return randomUUID().slice(0, 8);
}

export function uniqueEmail(who: string): string {
  return `${who}-${uniqueId()}@example.com`;
}

export const SHIPPING_ADDRESS = "123 Main St\nApt 4B\nSan Francisco, CA 94102";

/** An owner with a confirmed account, and a public baby registry with one item. */
export async function createRegistryWithItem() {
  const id = uniqueId();
  const ownerEmail = `owner-${id}@example.com`;

  const { data: created, error: userError } = await db.auth.admin.createUser({
    email: ownerEmail,
    password: `pw-${randomUUID()}`,
    email_confirm: true,
    user_metadata: { full_name: "Remi Owner" },
  });
  if (userError || !created.user) throw userError ?? new Error("No user");

  const { data: registry, error: registryError } = await db
    .from("registries")
    .insert({
      owner_id: created.user.id,
      title: `Remi & Max's Registry ${id}`,
      slug: `e2e-${id}`,
      is_public: true,
      registry_type: "baby",
      parent_names: "Remi & Max",
      settings: { shipping_address: SHIPPING_ADDRESS },
    })
    .select("id, slug, title")
    .single();
  if (registryError) throw registryError;

  const { data: item, error: itemError } = await db
    .from("registry_items")
    .insert({ registry_id: registry.id, title: `Sound Machine ${id}`, price: 59.99, quantity_needed: 1 })
    .select("id, title")
    .single();
  if (itemError) throw itemError;

  return { owner: { id: created.user.id, email: ownerEmail }, registry, item };
}

/** Reserves the registry's one item as a guest, from the registry page. */
export async function reserveGift(page: Page, opts: { slug: string; name: string; email: string }) {
  await page.goto(`/r/${opts.slug}`);
  await page.getByRole("button", { name: "Gift this" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your Name").fill(opts.name);
  await dialog.getByLabel("Your Email").fill(opts.email);
  await dialog.getByRole("button", { name: "Reserve and buy" }).click();
  // The next step shows the address to ship it to.
  await expect(dialog.getByText("123 Main St")).toBeVisible();
}

/** Calls the daily reservation job, as Vercel Cron does. */
export async function runReservationJob(page: Page): Promise<{ released: number; reminded: number }> {
  const response = await page.request.get("/api/cron/gift-reservations", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  return response.json();
}
