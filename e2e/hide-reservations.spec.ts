// "Hide what's been reserved from me" (issue #97). A personal wishlist that
// its owner adds to a gift exchange stops showing the owner what's been
// reserved, on the dashboard, the registry page, its public page and in
// emails. Guests and co-managers still see everything.

import { expect, test } from "@playwright/test";
import {
  createAccount,
  createExchangeEvent,
  createWishlist,
  db,
  joinExchange,
  reserveGift,
  signIn,
  SITE_URL,
  uniqueEmail,
} from "./fixtures";
import { emailsTo, linkIn, waitForEmail } from "./mailbox";

async function settingsOf(registryId: string) {
  const { data } = await db.from("registries").select("settings").eq("id", registryId).single();
  return (data?.settings ?? {}) as Record<string, unknown>;
}

test("a wishlist added to a gift exchange hides reservations from its owner only", async ({ browser }) => {
  const maya = await createAccount("Maya Owner");
  const sam = await createAccount("Sam Partner");
  const hal = await createAccount("Hal Host");
  const { registry, item } = await createWishlist(maya.id);
  // Sam co-manages Maya's wishlist.
  await db.from("registry_managers").insert({ registry_id: registry.id, user_id: sam.id, role: "manager" });
  const { guests } = await createExchangeEvent(hal.id, [{ name: "Maya", email: maya.email }]);

  // Maya RSVPs from her invitation, without signing in, and adds her wishlist.
  const mayaGuest = await browser.newContext();
  await joinExchange(await mayaGuest.newPage(), guests[0].rsvpPath, `${SITE_URL}/r/${registry.slug}`);
  await mayaGuest.close();
  await expect.poll(() => settingsOf(registry.id)).toMatchObject({
    hide_reservations: true,
    hide_reservations_source: "exchange",
  });

  // A guest reserves the scarf and says they bought it.
  const guestEmail = uniqueEmail("glinda");
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await reserveGift(guestPage, { slug: registry.slug, name: "Glinda Guest", email: guestEmail });
  const reserved = await waitForEmail(guestEmail, `You reserved "${item.title}". It's held for 2 days`);
  await guestPage.goto(linkIn(reserved, /\/gift\/[0-9a-f-]+\?step=confirm$/));
  await guestPage.getByRole("dialog").getByRole("button", { name: "Yes, I bought it" }).click();
  await expect(guestPage.getByRole("dialog").getByRole("heading", { name: "Thank you!" })).toBeVisible();

  // Sam, the co-manager, hears about it. Maya doesn't.
  await waitForEmail(sam.email, `🎁 Glinda Guest bought "${item.title}"`);
  await guestPage.waitForTimeout(1500);
  expect((await emailsTo(maya.email)).filter((e) => e.subject.includes("bought"))).toHaveLength(0);

  await guest.close();

  // Other guests still see that it's taken.
  const nextGuest = await browser.newContext();
  const nextGuestPage = await nextGuest.newPage();
  await nextGuestPage.goto(`/r/${registry.slug}`);
  await expect(nextGuestPage.getByText("0 of 1 still needed")).toBeVisible();
  await expect(nextGuestPage.getByText("Gifted", { exact: true })).toBeVisible();
  await nextGuest.close();

  // Maya sees nothing reserved: on the dashboard, the registry page, its
  // Gift Activity tab and her own list's public page.
  const mayaContext = await browser.newContext();
  const page = await mayaContext.newPage();
  await signIn(page, maya);
  await expect(page.getByText("What's been reserved is hidden from you")).toBeVisible();
  await page.goto(`/dashboard/registry/${registry.id}`);
  await expect(page.getByText("What's been reserved is hidden from you").first()).toBeVisible();
  await expect(page.getByText("Regibee hid it when you added this list to a gift exchange")).toBeVisible();
  await expect(page.getByText("1 of 1 still needed")).toBeVisible();
  await expect(page.getByText("Glinda Guest")).toHaveCount(0);
  await page.goto(`/dashboard/registry/${registry.id}?tab=purchases`);
  await expect(page.getByText("Glinda Guest")).toHaveCount(0);
  await page.goto(`/r/${registry.slug}`);
  await expect(page.getByText("What's been reserved is hidden from you")).toBeVisible();
  await expect(page.getByText("1 of 1 still needed")).toBeVisible();
  await expect(page.getByText("Gifted", { exact: true })).toHaveCount(0);

  // Sam still sees who gave it.
  const samContext = await browser.newContext();
  const samPage = await samContext.newPage();
  await signIn(samPage, sam);
  await samPage.goto(`/dashboard/registry/${registry.id}`);
  await expect(samPage.getByText("Gifted by Glinda Guest")).toBeVisible();
  await samContext.close();

  // After the holidays Maya turns it off, and sees who gave what.
  await page.goto(`/dashboard/registry/${registry.id}/settings`);
  const hideBox = page.getByRole("checkbox", { name: "Hide what's been reserved from me" });
  await expect(hideBox).toBeChecked();
  await hideBox.click({ force: true });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved!" })).toBeVisible();
  expect(await settingsOf(registry.id)).toMatchObject({ hide_reservations: false, hide_reservations_source: "owner" });
  await page.goto(`/dashboard/registry/${registry.id}`);
  await expect(page.getByText("Gifted by Glinda Guest")).toBeVisible();
  await mayaContext.close();
});

test("a child's list, and a list someone else pasted, keep showing reservations", async ({ browser }) => {
  const parent = await createAccount("Pat Parent");
  const other = await createAccount("Oz Other");
  const hal = await createAccount("Hal Host");
  // Pat keeps a wishlist for their kid, Lily, and joins the exchange for her.
  const kids = await createWishlist(parent.id, { settings: { for_child: true } });
  // Oz pastes Pat's own wishlist by mistake.
  const pats = await createWishlist(parent.id);
  const { guests } = await createExchangeEvent(hal.id, [
    { name: "Lily", email: parent.email },
    { name: "Oz", email: other.email },
  ]);

  const context = await browser.newContext();
  const page = await context.newPage();
  await joinExchange(page, guests[0].rsvpPath, `${SITE_URL}/r/${kids.registry.slug}`);
  await joinExchange(page, guests[1].rsvpPath, `${SITE_URL}/r/${pats.registry.slug}`);
  await context.close();

  const { data: rows } = await db
    .from("event_guests")
    .select("wishlist_url")
    .in("id", guests.map((g) => g.id));
  expect(rows?.every((r) => r.wishlist_url)).toBe(true);
  expect((await settingsOf(kids.registry.id)).hide_reservations).toBeUndefined();
  expect((await settingsOf(pats.registry.id)).hide_reservations).toBeUndefined();
});
