// An item's count of what's been given stays right (issues #112, #113, #119,
// 20261113213004_gift_counts.sql). Guests call the database functions with the
// anon key and an anonymous session, as the website does for them. Owners use
// their own session: the phone app updates items directly, and the website
// does the same from its server actions.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createAccount, createWishlist, db, signIn } from "./fixtures";
import { localSupabase } from "./local-supabase";

function anonClient(): SupabaseClient {
  const { apiUrl, anonKey } = localSupabase();
  return createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function asGuest() {
  const client = anonClient();
  const { error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return client;
}

async function asAccount(account: { email: string; password: string }) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword(account);
  if (error) throw error;
  return client;
}

async function countOf(itemId: string) {
  const { data, error } = await db.from("registry_items").select("quantity_fulfilled").eq("id", itemId).single();
  if (error) throw error;
  return data.quantity_fulfilled as number;
}

/** A wishlist whose one item needs two. */
async function listNeedingTwo() {
  const owner = await createAccount("Remi Owner");
  const { registry, item } = await createWishlist(owner.id);
  const { error } = await db.from("registry_items").update({ quantity_needed: 2 }).eq("id", item.id);
  if (error) throw error;
  return { owner, registry, item };
}

test("guests can't give a zero or negative amount or quantity (#112)", async () => {
  const { registry, item } = await listNeedingTwo();
  await db.from("registry_items").update({ is_parent_purchased: true }).eq("id", item.id);
  const { data: fund, error: fundError } = await db
    .from("cash_funds")
    .insert({ registry_id: registry.id, title: "Ski trip" })
    .select("id")
    .single();
  if (fundError) throw fundError;
  const guest = await asGuest();

  for (const amount of [0, -25]) {
    const { error } = await guest.rpc("reserve_cash_fund", { p_fund_id: fund.id, p_buyer_name: "Glinda", p_amount: amount });
    expect(error?.message).toContain("Amount must be more than zero");
  }
  const { error: fundGift } = await guest.rpc("reserve_cash_fund", { p_fund_id: fund.id, p_buyer_name: "Glinda", p_amount: 25 });
  expect(fundGift).toBeNull();
  const { data: after } = await db.from("cash_funds").select("current_amount").eq("id", fund.id).single();
  expect(Number(after?.current_amount)).toBe(25);

  for (const quantity of [0, -1]) {
    const { error } = await guest.rpc("cover_parent_item", { p_item_id: item.id, p_buyer_name: "Glinda", p_quantity: quantity });
    expect(error?.message).toContain("Quantity must be at least 1");
  }
  // The owners bought two, so a guest can't cover three.
  const { error: tooMany } = await guest.rpc("cover_parent_item", { p_item_id: item.id, p_buyer_name: "Glinda", p_quantity: 3 });
  expect(tooMany?.message).toContain("Not enough items available to gift");
  const { error: cover } = await guest.rpc("cover_parent_item", { p_item_id: item.id, p_buyer_name: "Glinda", p_quantity: 2 });
  expect(cover).toBeNull();
});

test("cancelling a gift that covered a bought item leaves its count alone (#113)", async () => {
  const { owner, item } = await listNeedingTwo();
  const remi = await asAccount(owner);
  const guest = await asGuest();

  // Marked bought from the phone app, which updates the row directly.
  await remi.from("registry_items").update({ is_parent_purchased: true, quantity_fulfilled: 2 }).eq("id", item.id);
  expect(await countOf(item.id)).toBe(2);

  const { data: coverId, error } = await guest.rpc("cover_parent_item", { p_item_id: item.id, p_buyer_name: "Glinda" });
  expect(error).toBeNull();
  expect(await countOf(item.id)).toBe(2);

  const { error: cancelError } = await remi.rpc("cancel_reservation", { p_purchase_id: coverId, p_owner_id: owner.id });
  expect(cancelError).toBeNull();
  expect(await countOf(item.id)).toBe(2);

  // A gift on an item the owners didn't buy still comes off when cancelled.
  await remi.from("registry_items").update({ is_parent_purchased: false, quantity_fulfilled: 0 }).eq("id", item.id);
  const { data: giftId } = await guest.rpc("reserve_registry_item", { p_item_id: item.id, p_buyer_name: "Glinda", p_hold_days: 2 });
  expect(await countOf(item.id)).toBe(1);
  await remi.rpc("cancel_reservation", { p_purchase_id: giftId, p_owner_id: owner.id });
  expect(await countOf(item.id)).toBe(0);
});

test("unmarking already bought keeps guests' gifts counted (#119)", async ({ page }) => {
  const { owner, registry, item } = await listNeedingTwo();
  const guest = await asGuest();

  // A guest reserves one of the two before the owner says they bought it.
  const { error } = await guest.rpc("reserve_registry_item", { p_item_id: item.id, p_buyer_name: "Glinda", p_hold_days: 2 });
  expect(error).toBeNull();
  expect(await countOf(item.id)).toBe(1);

  // The owner marks it bought on the website, then changes their mind.
  await signIn(page, owner);
  await page.goto(`/dashboard/registry/${registry.id}`);
  // The list has one item, so these are its buttons.
  const markBought = page.getByRole("button", { name: /Mark as (bought by parent|already bought)/ }).first();
  const unmark = page.getByRole("button", { name: "Mark as unpurchased" }).first();
  await markBought.click();
  await expect(unmark).toBeVisible();
  expect(await countOf(item.id)).toBe(2);

  await unmark.click();
  await expect(markBought).toBeVisible();
  // Before the fix this was 0, and another guest could reserve the same gift.
  expect(await countOf(item.id)).toBe(1);

  // So only one more can be reserved.
  const { error: tooMany } = await guest.rpc("reserve_registry_item", { p_item_id: item.id, p_buyer_name: "Ozma", p_quantity: 2 });
  expect(tooMany?.message).toContain("Not enough quantity available");

  // A guest who covered it while it was marked bought counts once it's
  // unmarked, and cancelling their gift takes it off again.
  const remi = await asAccount(owner);
  await remi.from("registry_items").update({ is_parent_purchased: true, quantity_fulfilled: 2 }).eq("id", item.id);
  const { data: coverId } = await guest.rpc("cover_parent_item", { p_item_id: item.id, p_buyer_name: "Ozma" });
  await remi.from("registry_items").update({ is_parent_purchased: false, quantity_fulfilled: 0 }).eq("id", item.id);
  expect(await countOf(item.id)).toBe(2);
  await remi.rpc("cancel_reservation", { p_purchase_id: coverId, p_owner_id: owner.id });
  expect(await countOf(item.id)).toBe(1);
});
