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

/** A confirmed account with a password, for tests that sign in. */
export async function createAccount(fullName: string) {
  const email = uniqueEmail(fullName.split(" ")[0].toLowerCase());
  const password = `pw-${randomUUID()}`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw error ?? new Error("No user");
  return { id: data.user.id, email, password, name: fullName };
}

/** Signs in from the login page. */
export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/dashboard/);
}

/** A personal wishlist with one item, owned by the given account. */
export async function createWishlist(ownerId: string, opts: { settings?: Record<string, unknown> } = {}) {
  const id = uniqueId();
  const { data: registry, error } = await db
    .from("registries")
    .insert({
      owner_id: ownerId,
      title: `Christmas Wishlist ${id}`,
      slug: `e2e-wish-${id}`,
      is_public: true,
      registry_type: "personal",
      event_type: "christmas",
      honoree_names: "Maya",
      settings: { shipping_address: SHIPPING_ADDRESS, ...opts.settings },
    })
    .select("id, slug, title, settings")
    .single();
  if (error) throw error;
  const { data: item, error: itemError } = await db
    .from("registry_items")
    .insert({ registry_id: registry.id, title: `Wool Scarf ${id}`, price: 40, quantity_needed: 1 })
    .select("id, title")
    .single();
  if (itemError) throw itemError;
  return { registry, item };
}

/**
 * A Secret Santa event hosted by the given account, with these guests on its
 * list. Each guest comes back with their personal RSVP link.
 */
export async function createExchangeEvent(
  hostId: string,
  guests: { name: string; email: string | null }[],
) {
  const id = uniqueId();
  const { data: event, error } = await db
    .from("events")
    .insert({ owner_id: hostId, slug: `e2e-santa-${id}`, event_type: "christmas", title: `Family Secret Santa ${id}` })
    .select("id, slug, title")
    .single();
  if (error) throw error;
  const { error: exchangeError } = await db.from("gift_exchanges").insert({ event_id: event.id, budget: "$25" });
  if (exchangeError) throw exchangeError;
  const rows = guests.map((g) => ({ event_id: event.id, name: g.name, email: g.email, token: randomUUID().replace(/-/g, "") }));
  const { data: saved, error: guestError } = await db.from("event_guests").insert(rows).select("id, name, token");
  if (guestError) throw guestError;
  return {
    event,
    guests: saved.map((g) => ({ ...g, rsvpPath: `/e/${event.slug}?g=${g.token}` })),
  };
}

/** RSVPs yes from a guest's personal link, joins the exchange and adds a wishlist link. */
export async function joinExchange(page: Page, rsvpPath: string, wishlistUrl: string) {
  await page.goto(rsvpPath);
  await page.getByRole("button", { name: "Going" }).click();
  await page.getByLabel("Your wishlist (optional)").fill(wishlistUrl);
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByText("You're in the gift exchange.")).toBeVisible();
}
