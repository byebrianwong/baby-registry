// Group gifts (issue #105). A friend starts one on an item, which reserves
// it in their name, held until they buy it. Others chip in from the link,
// with no account. The list's owner only sees an ordinary reservation, and
// hears about it the usual way once it's bought.

import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createAccount, createWishlist, db, signIn, SITE_URL, uniqueEmail, uniqueId } from "./fixtures";
import { emailsTo, linkIn, waitForEmail } from "./mailbox";

const DAY_MS = 24 * 60 * 60 * 1000;
const SHARE_LINK = /\/group-gift\/[A-Za-z0-9_-]+$/;

/** Starts a group gift on the list's one item, signed in as the organizer. */
async function startGroupGift(page: Page, slug: string, payback: string) {
  await page.goto(`/r/${slug}`);
  await page.getByRole("button", { name: "Group gift" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Total to collect")).toHaveValue("40");
  await dialog.getByLabel("How should people pay you back?").fill(payback);
  await dialog.getByRole("button", { name: "Start group gift" }).click();
  await page.waitForURL(/\/group-gift\//);
  await expect(page.getByText("Share this link with friends")).toBeVisible();
}

/** Chips in from the share link in a fresh browser, with no account. */
async function chipInAsGuest(browser: Browser, shareUrl: string, opts: { name: string; email: string; amount: string }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(shareUrl);
  await page.getByLabel("Your name").fill(opts.name);
  await page.getByLabel("Your email").fill(opts.email);
  await page.getByLabel("Your share").fill(opts.amount);
  await page.getByRole("button", { name: "Chip in" }).click();
  await expect(page.getByText(/You're in for \$/)).toBeVisible();
  return { context, page };
}

test("a friend starts a group gift, a guest chips in, and the owner only sees an ordinary gift", async ({ browser }) => {
  // Five browsers and seven emails: longer than the usual minute.
  test.setTimeout(150_000);
  const maya = await createAccount("Maya Owner");
  const oz = await createAccount("Oz Organizer");
  const { registry, item } = await createWishlist(maya.id);

  // Oz starts it from Maya's list.
  const ozContext = await browser.newContext();
  const ozPage = await ozContext.newPage();
  await signIn(ozPage, oz);
  await startGroupGift(ozPage, registry.slug, "Venmo @oz");

  const started = await waitForEmail(oz.email, `Your group gift for Maya: "${item.title}"`);
  const shareUrl = linkIn(started, SHARE_LINK);
  expect(shareUrl.startsWith(`${SITE_URL}/group-gift/`)).toBe(true);
  expect(ozPage.url()).toBe(shareUrl);

  // It's an ordinary reservation in Oz's name, held until it's bought.
  const { data: purchase } = await db
    .from("purchases")
    .select("buyer_name, status, reserved_until")
    .eq("registry_item_id", item.id)
    .single();
  expect(purchase?.buyer_name).toBe("Oz and others");
  expect(purchase?.status).toBe("reserved");
  expect(new Date(purchase!.reserved_until!).getTime() - Date.now()).toBeGreaterThan(300 * DAY_MS);

  // Glinda chips in with no account, and gets her own link.
  const glindaEmail = uniqueEmail("glinda");
  const glinda = await chipInAsGuest(browser, shareUrl, { name: "Glinda Guest", email: glindaEmail, amount: "25" });
  await expect(glinda.page.getByText("Pay Oz Organizer back:")).toBeVisible();
  await glinda.context.close();
  const pledged = await waitForEmail(glindaEmail, `You're chipping in $25 for "${item.title}"`);
  const glindaLink = linkIn(pledged, /\/group-gift\/[A-Za-z0-9_-]+\?p=[A-Za-z0-9_-]+$/);
  await waitForEmail(oz.email, `Glinda Guest is chipping in $25 for "${item.title}"`);

  // From her email, in a new browser, she changes it.
  const glindaLater = await browser.newContext();
  const glindaPage = await glindaLater.newPage();
  await glindaPage.goto(glindaLink);
  await expect(glindaPage.getByText("$25 of $40")).toBeVisible();
  await glindaPage.getByRole("button", { name: "Change amount" }).click();
  await glindaPage.getByLabel("Your new amount").fill("30");
  await glindaPage.getByRole("button", { name: "Save" }).click();
  await expect(glindaPage.getByText("Changed to $30.")).toBeVisible();
  await glindaPage.reload();
  await expect(glindaPage.getByText("$30 of $40")).toBeVisible();
  await glindaLater.close();

  // Someone else on the list's page sees an ordinary reservation.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/r/${registry.slug}`);
  await expect(visitorPage.getByText("Reserved by a guest")).toBeVisible();
  await expect(visitorPage.getByRole("button", { name: "Group gift" })).toHaveCount(0);
  await visitor.close();

  // Maya sees "Oz and others", never the pledges, and the link shows her nothing.
  const mayaContext = await browser.newContext();
  const mayaPage = await mayaContext.newPage();
  await signIn(mayaPage, maya);
  await mayaPage.goto(`/dashboard/registry/${registry.id}?tab=purchases`);
  await expect(mayaPage.getByText("Oz and others")).toBeVisible();
  await expect(mayaPage.getByText("Glinda")).toHaveCount(0);
  await mayaPage.goto(shareUrl);
  await expect(mayaPage.getByRole("heading", { name: "This one's a surprise" })).toBeVisible();
  await expect(mayaPage.getByText("Glinda")).toHaveCount(0);
  await expect(mayaPage.getByText("$30")).toHaveCount(0);

  // Oz ticks Glinda off and marks it bought. Maya hears it the usual way.
  await ozPage.reload();
  // React Aria's checkbox hides its input, so click the row's "Paid" label.
  await ozPage.getByRole("listitem").filter({ hasText: "Glinda Guest" }).getByText("Paid").click();
  await expect(ozPage.getByRole("checkbox", { name: "Glinda Guest paid" })).toBeChecked();
  await ozPage.getByRole("button", { name: "I bought it" }).click();
  await ozPage.getByRole("button", { name: "Yes, I bought it" }).click();
  await expect(ozPage.getByText("You bought it")).toBeVisible();
  await waitForEmail(maya.email, `🎁 Oz and others bought "${item.title}"`);

  const [{ data: bought }, { data: pledge }] = await Promise.all([
    db.from("purchases").select("status").eq("registry_item_id", item.id).single(),
    db.from("group_gift_pledges").select("amount, paid_at").eq("email", glindaEmail).single(),
  ]);
  expect(bought?.status).toBe("purchased");
  expect(Number(pledge?.amount)).toBe(30);
  expect(pledge?.paid_at).not.toBeNull();

  await mayaContext.close();
  await ozContext.close();
});

test("the organizer calls it off, the item goes back on the list, and pledgers hear", async ({ browser }) => {
  const maya = await createAccount("Maya Owner");
  const oz = await createAccount("Oz Organizer");
  const { registry, item } = await createWishlist(maya.id);

  const ozContext = await browser.newContext();
  const ozPage = await ozContext.newPage();
  await signIn(ozPage, oz);
  await startGroupGift(ozPage, registry.slug, "Zelle oz@example.com");
  const shareUrl = ozPage.url();

  const scarecrowEmail = uniqueEmail("scarecrow");
  const scarecrow = await chipInAsGuest(browser, shareUrl, { name: "Scarecrow", email: scarecrowEmail, amount: "10" });
  await scarecrow.context.close();

  await ozPage.reload();
  await ozPage.getByRole("button", { name: "Call it off" }).click();
  await ozPage.getByRole("group").getByRole("button", { name: "Call it off" }).click();
  await expect(ozPage.getByText("This group gift was called off")).toBeVisible();
  await waitForEmail(scarecrowEmail, `The group gift of "${item.title}" was called off`);

  const { data: itemRow } = await db.from("registry_items").select("quantity_fulfilled").eq("id", item.id).single();
  expect(itemRow?.quantity_fulfilled).toBe(0);
  await ozPage.goto(`/r/${registry.slug}`);
  await expect(ozPage.getByRole("button", { name: "Gift this" })).toBeVisible();
  await expect(ozPage.getByRole("button", { name: "Group gift" })).toBeVisible();

  // The owner was never told anything.
  expect((await emailsTo(maya.email)).filter((e) => e.subject.includes(item.title))).toHaveLength(0);
  await ozContext.close();
});

test("a group gift started from an event's invitation shows to its other guests", async ({ browser }) => {
  const maya = await createAccount("Maya Owner");
  const oz = await createAccount("Oz Organizer");
  const host = await createAccount("Hal Host");
  const { registry, item } = await createWishlist(maya.id);

  const id = uniqueId();
  const { data: event, error } = await db
    .from("events")
    .insert({ owner_id: host.id, slug: `e2e-party-${id}`, event_type: "birthday", title: `Maya's party ${id}` })
    .select("id, slug, title")
    .single();
  if (error) throw error;
  await db.from("event_registries").insert({ event_id: event.id, registry_id: registry.id });
  const guests = [
    { name: "Oz Organizer", email: oz.email },
    { name: "Tin Guest", email: uniqueEmail("tin") },
    { name: "Maya Owner", email: maya.email },
  ].map((g) => ({ ...g, event_id: event.id, token: randomUUID().replace(/-/g, "") }));
  const { error: guestError } = await db.from("event_guests").insert(guests);
  if (guestError) throw guestError;
  const [ozGuest, tinGuest, mayaGuest] = guests;

  // Oz follows the gift link on his invitation, then starts a group gift.
  const ozContext = await browser.newContext();
  const ozPage = await ozContext.newPage();
  await signIn(ozPage, oz);
  await ozPage.goto(`/e/${event.slug}/gifts?g=${ozGuest.token}&to=${registry.slug}`);
  await ozPage.waitForURL(new RegExp(`/r/${registry.slug}$`));
  await ozPage.getByRole("button", { name: "Group gift" }).click();
  await expect(ozPage.getByRole("dialog").getByText(`Guests of ${event.title} will see it`)).toBeVisible();
  await ozPage.getByRole("dialog").getByRole("button", { name: "Start group gift" }).click();
  await ozPage.waitForURL(/\/group-gift\//);
  await expect(ozPage.getByRole("link", { name: event.title })).toBeVisible();
  await ozContext.close();

  // Tin sees it on his own invitation link.
  const tinContext = await browser.newContext();
  const tinPage = await tinContext.newPage();
  await tinPage.goto(`/e/${event.slug}?g=${tinGuest.token}`);
  const section = tinPage.getByRole("region", { name: "Group gifts" });
  await expect(section.getByText(item.title)).toBeVisible();
  await section.getByRole("link", { name: "Chip in" }).click();
  await tinPage.waitForURL(/\/group-gift\//);
  await tinContext.close();

  // Maya is a guest too, but it's her list, so her invitation doesn't show it.
  const mayaContext = await browser.newContext();
  const mayaPage = await mayaContext.newPage();
  await mayaPage.goto(`/e/${event.slug}?g=${mayaGuest.token}`);
  await expect(mayaPage.getByRole("heading", { name: event.title })).toBeVisible();
  await expect(mayaPage.getByRole("region", { name: "Group gifts" })).toHaveCount(0);
  await mayaContext.close();
});
