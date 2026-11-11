// Groups (issue #98): saved guest lists that last. A host saves a guest list
// as a group, invites the whole group to another event, runs next year's gift
// exchange inside it, and shares a private wishlist with it.

import { expect, test, type Page } from "@playwright/test";
import { createAccount, createExchangeEvent, createWishlist, db, signIn, uniqueEmail, uniqueId } from "./fixtures";

async function guestsOf(eventId: string) {
  const { data } = await db.from("event_guests").select("id, name, email, giftee_id").eq("event_id", eventId);
  return data ?? [];
}

async function openEvent(page: Page, eventId: string) {
  await page.goto(`/dashboard/events/${eventId}`);
  await expect(page.getByRole("heading", { name: "Add guests" })).toBeVisible();
}

test("a guest list saved as a group fills an event and runs next year's exchange", async ({ page }) => {
  const host = await createAccount("Hal Host");
  const ann = uniqueEmail("ann");
  const ben = uniqueEmail("ben");
  const cy = uniqueEmail("cy");
  // Last year's Secret Santa.
  const { event: lastYear, guests } = await createExchangeEvent(host.id, [
    { name: "Ann", email: ann },
    { name: "Ben", email: ben },
    { name: "Cy", email: cy },
    { name: "Grandma", email: null },
  ]);
  const id = Object.fromEntries(guests.map((g) => [g.name, g.id]));
  // Everyone was in, Ann and Ben are partners, and names were drawn.
  await db.from("event_guests").update({ in_exchange: true }).eq("event_id", lastYear.id);
  await db.from("exchange_exclusions").insert({
    event_id: lastYear.id,
    guest_a: [id.Ann, id.Ben].sort()[0],
    guest_b: [id.Ann, id.Ben].sort()[1],
  });
  for (const [giver, receiver] of [
    ["Ann", "Cy"],
    ["Cy", "Ben"],
    ["Ben", "Grandma"],
    ["Grandma", "Ann"],
  ]) {
    await db.from("event_guests").update({ giftee_id: id[receiver] }).eq("id", id[giver]);
  }
  await db.from("gift_exchanges").update({ drawn_at: new Date().toISOString() }).eq("event_id", lastYear.id);

  // The host saves the guest list as a group.
  await signIn(page, host);
  await openEvent(page, lastYear.id);
  await page.getByRole("button", { name: "Save as a group" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Group name").fill("The Chens");
  await dialog.getByRole("button", { name: "Save group" }).click();
  await page.waitForURL(/\/dashboard\/groups\//);
  const groupId = page.url().split("/dashboard/groups/")[1];
  await expect(page.getByRole("heading", { name: "The Chens" })).toBeVisible();
  await expect(page.getByText("4 people.")).toBeVisible();
  const { data: event } = await db.from("events").select("group_id").eq("id", lastYear.id).single();
  expect(event?.group_id).toBe(groupId);

  // The Events tab lists it.
  await page.goto("/dashboard/events");
  await expect(page.getByRole("link", { name: /The Chens/ })).toBeVisible();

  // A cousin joins the family. Adding Ann again changes nothing.
  await page.goto(`/dashboard/groups/${groupId}`);
  const dee = uniqueEmail("dee");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Dee");
  await page.getByRole("textbox", { name: "Email (optional)" }).fill(dee);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(dee)).toBeVisible();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Ann again");
  await page.getByRole("textbox", { name: "Email (optional)" }).fill(ann.toUpperCase());
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Added 0 people. 1 already in the group.")).toBeVisible();

  // This year's exchange, from the group.
  await page.getByRole("button", { name: "Start this year's exchange" }).click();
  await page.waitForURL(/\/dashboard\/events\/(?!.*groups)/);
  const thisYearId = page.url().split("/dashboard/events/")[1];
  expect(thisYearId).not.toBe(lastYear.id);
  const { data: thisYear } = await db
    .from("events")
    .select("repeated_from, group_id, gift_exchanges(budget)")
    .eq("id", thisYearId)
    .single();
  expect(thisYear).toMatchObject({ repeated_from: lastYear.id, group_id: groupId });
  const newGuests = await guestsOf(thisYearId);
  expect(newGuests.map((g) => g.name).sort()).toEqual(["Ann", "Ben", "Cy", "Dee", "Grandma"]);
  const newId = Object.fromEntries(newGuests.map((g) => [g.name, g.id]));
  // Ann and Ben still don't draw each other.
  const { data: exclusions } = await db.from("exchange_exclusions").select("guest_a, guest_b").eq("event_id", thisYearId);
  expect(exclusions).toEqual([{ guest_a: [newId.Ann, newId.Ben].sort()[0], guest_b: [newId.Ann, newId.Ben].sort()[1] }]);

  // Everyone joins, the host draws, and nobody gets last year's person.
  await db.from("event_guests").update({ in_exchange: true }).eq("event_id", thisYearId);
  await page.reload();
  await page.getByRole("button", { name: "Draw names" }).click();
  await page.getByRole("button", { name: "Draw names" }).click();
  await expect(page.getByRole("button", { name: "Draw again" })).toBeVisible();
  const drawn = await guestsOf(thisYearId);
  const nameOf = new Map(drawn.map((g) => [g.id, g.name]));
  const pairs = drawn.map((g) => `${g.name}->${nameOf.get(g.giftee_id ?? "")}`);
  for (const old of ["Ann->Cy", "Cy->Ben", "Ben->Grandma", "Grandma->Ann", "Ann->Ben", "Ben->Ann"]) {
    expect(pairs).not.toContain(old);
  }
});

test("Invite a group adds its people to a guest list once", async ({ page }) => {
  const host = await createAccount("Hal Host");
  const ann = uniqueEmail("ann");
  const { data: group } = await db.from("groups").insert({ owner_id: host.id, name: `Book club ${uniqueId()}` }).select("id, name").single();
  await db.from("group_members").insert([
    { group_id: group!.id, name: "Ann", email: ann },
    { group_id: group!.id, name: "Bo", email: uniqueEmail("bo") },
    { group_id: group!.id, name: "Grandpa", email: null },
  ]);
  // A dinner that already has Ann on its list.
  const { data: dinner } = await db
    .from("events")
    .insert({ owner_id: host.id, slug: `e2e-dinner-${uniqueId()}`, event_type: "other", title: "Supper club" })
    .select("id")
    .single();
  await db.from("event_guests").insert({ event_id: dinner!.id, name: "Ann", email: ann, token: `t-${uniqueId()}` });

  await signIn(page, host);
  await openEvent(page, dinner!.id);
  await page.getByLabel("Invite a group").selectOption({ label: `${group!.name} (3 people)` });
  await expect(page.getByText("Added 2 guests. 1 already on the list.")).toBeVisible();
  expect((await guestsOf(dinner!.id)).map((g) => g.name).sort()).toEqual(["Ann", "Bo", "Grandpa"]);
});

test("a private wishlist shared with a group shows to its members only", async ({ browser }) => {
  const rose = await createAccount("Rose Chen");
  const ann = await createAccount("Ann Chen");
  const zed = await createAccount("Zed Stranger");
  const { registry } = await createWishlist(rose.id);
  await db.from("registries").update({ is_public: false, listed_on_profile: true }).eq("id", registry.id);
  const { data: family } = await db.from("groups").insert({ owner_id: rose.id, name: "The Chens" }).select("id").single();
  // Ann is in the group by the email on her account.
  await db.from("group_members").insert({ group_id: family!.id, name: "Ann", email: ann.email });
  const { data: roseProfile } = await db.from("profiles").select("public_id").eq("id", rose.id).single();

  // Rose shares the list with the family from its settings.
  const roseContext = await browser.newContext();
  const rosePage = await roseContext.newPage();
  await signIn(rosePage, rose);
  await rosePage.goto(`/dashboard/registry/${registry.id}/settings`);
  await rosePage.getByRole("checkbox", { name: /The Chens/ }).click({ force: true });
  await rosePage.getByRole("button", { name: "Save groups" }).click();
  await expect.poll(async () => (await db.from("registry_groups").select("group_id").eq("registry_id", registry.id)).data).toEqual([
    { group_id: family!.id },
  ]);
  await roseContext.close();

  // Ann sees it on her Following page, though she follows nobody, and on
  // Rose's profile, though it's private.
  const annContext = await browser.newContext();
  const annPage = await annContext.newPage();
  await signIn(annPage, ann);
  await annPage.goto("/dashboard/following");
  await expect(annPage.getByRole("heading", { name: "Shared with your groups" })).toBeVisible();
  await expect(annPage.getByText(registry.title)).toBeVisible();
  await expect(annPage.getByText("Rose Chen · The Chens")).toBeVisible();
  await annPage.goto(`/u/${roseProfile!.public_id}`);
  await expect(annPage.getByText(registry.title)).toBeVisible();
  await annContext.close();

  // Zed, who isn't in the group, sees neither.
  const zedContext = await browser.newContext();
  const zedPage = await zedContext.newPage();
  await signIn(zedPage, zed);
  await zedPage.goto("/dashboard/following");
  await expect(zedPage.getByText("You're not following anyone yet")).toBeVisible();
  await expect(zedPage.getByText(registry.title)).toHaveCount(0);
  await zedPage.goto(`/u/${roseProfile!.public_id}`);
  await expect(zedPage.getByText("Rose Chen").first()).toBeVisible();
  await expect(zedPage.getByText(registry.title)).toHaveCount(0);
  await zedContext.close();
});
