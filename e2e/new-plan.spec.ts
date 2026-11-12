// "What are you planning?" (issue #103): the one New button. Each plan goes
// through the picker the way a person would, and checks what it made.

import { expect, test, type Page } from "@playwright/test";
import { createAccount, createWishlist, db, signIn, SITE_URL, uniqueEmail } from "./fixtures";
import { linkIn, waitForEmail } from "./mailbox";

async function openPicker(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What are you planning?" })).toBeVisible();
}

/**
 * Picks an occasion. A click that lands before the page's scripts have loaded
 * does nothing, so it's tried again until the picker moves on.
 */
async function chooseOccasion(page: Page, label: string) {
  await expect(async () => {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: "What are you planning?" })).toBeHidden({ timeout: 1000 });
  }).toPass();
}

async function eventIdFrom(page: Page): Promise<string> {
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  return page.url().split("/dashboard/events/")[1];
}

async function linkedRegistries(eventId: string) {
  const { data } = await db
    .from("event_registries")
    .select("registries(id, owner_id, title, registry_type, event_type, honoree_names, settings)")
    .eq("event_id", eventId);
  return (data ?? []).map((row) => row.registries as unknown as Record<string, unknown>);
}

test("a friend's baby shower links the parents' registry", async ({ page }) => {
  const host = await createAccount("Hal Host");
  const parent = await createAccount("Remi Parent");
  const { registry } = await createWishlist(parent.id);

  await signIn(page, host);
  await openPicker(page);
  await chooseOccasion(page, "Baby shower");
  await expect(page.getByRole("button", { name: "Someone else" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Their name").fill("Remi");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /Link a list/ }).click();
  await page.getByLabel("Link to the list").fill(`${SITE_URL}/r/${registry.slug}`);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Event name")).toHaveValue("Remi's Baby Shower");
  await page.getByRole("button", { name: "Make the event" }).click();

  const eventId = await eventIdFrom(page);
  const { data: event } = await db.from("events").select("event_type, title, owner_id").eq("id", eventId).single();
  expect(event).toEqual({ event_type: "baby_shower", title: "Remi's Baby Shower", owner_id: host.id });
  expect((await linkedRegistries(eventId)).map((r) => r.id)).toEqual([registry.id]);
  // The parents hear their registry was linked.
  await waitForEmail(parent.email, "Hal Host linked your registry to Remi's Baby Shower");
});

test("a kid's birthday makes the child's wishlist and the invitation together", async ({ page }) => {
  const parent = await createAccount("Pat Parent");
  await signIn(page, parent);
  await openPicker(page);
  await chooseOccasion(page, "Kid's birthday");
  await page.getByLabel("Your child's name").fill("Jordan");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /Make their birthday wishlist/ }).click();
  await expect(page.getByRole("checkbox", { name: "Also make an invitation" })).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Date (optional)").fill("2027-03-14");
  await page.getByRole("button", { name: "Make the event" }).click();

  const eventId = await eventIdFrom(page);
  const { data: event } = await db.from("events").select("event_type, title, ask_kids, event_date").eq("id", eventId).single();
  expect(event).toEqual({
    event_type: "kids_birthday",
    title: "Jordan's Birthday Party",
    ask_kids: true,
    event_date: "2027-03-14",
  });
  const [list] = await linkedRegistries(eventId);
  expect(list).toMatchObject({
    owner_id: parent.id,
    title: "Jordan's Birthday Wishlist",
    registry_type: "personal",
    event_type: "birthday",
    honoree_names: "Jordan",
  });
  // A parent keeps their child's list, so it always shows what's reserved (#97).
  expect(list.settings).toMatchObject({ for_child: true });
});

test("asking the person it's for to make a list links it once they do", async ({ page, browser }) => {
  const host = await createAccount("Hal Host");
  const remi = await createAccount("Remi Chen");

  await signIn(page, host);
  await openPicker(page);
  await chooseOccasion(page, "Baby shower");
  await page.getByLabel("Their name").fill("Remi");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /Ask them to make one/ }).click();
  await page.getByLabel("Remi's email").fill(remi.email);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(`An email to ${remi.email} asking for a baby registry`)).toBeVisible();
  await page.getByRole("button", { name: "Make the event" }).click();
  const eventId = await eventIdFrom(page);
  await expect(page.getByText(`Waiting for Remi to make their list. We emailed ${remi.email}.`)).toBeVisible();

  const email = await waitForEmail(remi.email, "Hal Host asked you to make a baby registry for Remi's Baby Shower");
  const requestUrl = linkIn(email, /\/list-request\/[0-9a-f]+$/);

  // Remi opens the link, signs in and makes the registry.
  const remiContext = await browser.newContext();
  const remiPage = await remiContext.newPage();
  await signIn(remiPage, remi);
  await remiPage.goto(requestUrl.replace(SITE_URL, ""));
  await remiPage.getByRole("button", { name: "Make my baby registry" }).click();
  await remiPage.waitForURL(/\/dashboard\/registry\/[0-9a-f-]{36}$/);
  await remiContext.close();

  const [list] = await linkedRegistries(eventId);
  expect(list).toMatchObject({ owner_id: remi.id, registry_type: "baby", title: "Remi's Baby Registry" });
  const { data: request } = await db.from("event_list_requests").select("registry_id, fulfilled_at").eq("event_id", eventId).single();
  expect(request?.registry_id).toBe(list.id);

  // The host's page shows the list instead of the wait.
  await page.reload();
  await expect(page.getByRole("link", { name: "Remi's Baby Registry" })).toBeVisible();
  await expect(page.getByText(/Waiting for Remi/)).toHaveCount(0);

  // The link only makes one list.
  const again = await browser.newContext();
  const againPage = await again.newPage();
  await againPage.goto(requestUrl.replace(SITE_URL, ""));
  await expect(againPage.getByText("A list was already made from this link")).toBeVisible();
  await again.close();
});

test("a Secret Santa and a wishlist on its own", async ({ page }) => {
  const maya = await createAccount("Maya Owner");
  await signIn(page, maya);

  // A gift exchange goes straight to its name: everyone draws names.
  await openPicker(page);
  await chooseOccasion(page, "Gift exchange");
  await page.getByLabel("Event name").fill("Chen Family Secret Santa");
  await page.getByRole("button", { name: "Make the event" }).click();
  const eventId = await eventIdFrom(page);
  const { data: exchange } = await db.from("gift_exchanges").select("event_id").eq("event_id", eventId).maybeSingle();
  expect(exchange?.event_id).toBe(eventId);

  // Just a wishlist: no event.
  await openPicker(page);
  await expect(async () => {
    await page.getByRole("button", { name: "Make just a wishlist" }).click();
    await expect(page.getByLabel("List name")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByLabel("List name")).toHaveValue("Maya's Wishlist");
  await page.getByRole("button", { name: "Make the list" }).click();
  await page.waitForURL(/\/dashboard\/registry\/[0-9a-f-]{36}$/);
  const registryId = page.url().split("/dashboard/registry/")[1];
  const { data: registry } = await db.from("registries").select("owner_id, registry_type, event_type").eq("id", registryId).single();
  expect(registry).toEqual({ owner_id: maya.id, registry_type: "personal", event_type: "other" });
  const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("owner_id", maya.id);
  expect(count).toBe(1);
});
