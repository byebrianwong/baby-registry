// A guest reserves a gift with no account, and every email that follows:
// the reservation, the owners' notice once it's bought, the reminder, and the
// email when a reservation runs out.

import { expect, test } from "@playwright/test";
import {
  createRegistryWithItem,
  db,
  reserveGift,
  runReservationJob,
  SITE_URL,
  uniqueEmail,
} from "./fixtures";
import { emailsTo, linkIn, waitForEmail } from "./mailbox";

test("a guest reserves a gift, confirms it from the email, and the owners hear", async ({ page, browser }) => {
  const { owner, registry, item } = await createRegistryWithItem();
  const guestEmail = uniqueEmail("guest");

  await reserveGift(page, { slug: registry.slug, name: "Glinda Guest", email: guestEmail });

  const reserved = await waitForEmail(guestEmail, `You reserved "${item.title}". It's held for 2 days`);
  expect(reserved.from).toBe("Regibee <notifications@regibee.com>");
  expect(reserved.html).toContain("123 Main St");
  const confirmUrl = linkIn(reserved, /\/gift\/[0-9a-f-]+\?step=confirm$/);
  expect(confirmUrl.startsWith(`${SITE_URL}/r/${registry.slug}/gift/`)).toBe(true);
  linkIn(reserved, /\/gift\/[0-9a-f-]+\?step=release$/);

  // The owners hear about a gift only once the guest says they bought it.
  expect(await emailsTo(owner.email)).toHaveLength(0);

  // The guest opens the link from their email app, in a browser that has
  // never seen the registry.
  const emailApp = await browser.newContext();
  const fromEmail = await emailApp.newPage();
  await fromEmail.goto(confirmUrl);
  const dialog = fromEmail.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: `Did you buy the ${item.title}?` })).toBeVisible();
  await dialog.getByRole("button", { name: "Yes, I bought it" }).click();
  await expect(dialog.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  const toOwner = await waitForEmail(owner.email, `🎁 Glinda Guest bought "${item.title}"`);
  expect(toOwner.links).toContain(`${SITE_URL}/dashboard/registry/${registry.id}?highlight=${item.id}`);
  const toGuest = await waitForEmail(guestEmail, `Your gift is confirmed — "${item.title}"`);
  linkIn(toGuest, /\/gift\/[0-9a-f-]+\?step=release$/);

  const { data: purchase } = await db
    .from("purchases")
    .select("status, reserved_until")
    .eq("registry_item_id", item.id)
    .single();
  expect(purchase).toEqual({ status: "purchased", reserved_until: expect.anything() });
  await emailApp.close();
});

test("the daily job reminds a guest, then ends a reservation that ran out", async ({ page }) => {
  const { owner, registry, item } = await createRegistryWithItem();
  const guestEmail = uniqueEmail("guest");
  await reserveGift(page, { slug: registry.slug, name: "Glinda Guest", email: guestEmail });
  await waitForEmail(guestEmail, `You reserved "${item.title}". It's held for 2 days`);

  // Only Vercel Cron, with the secret, can run the job.
  expect((await page.request.get("/api/cron/gift-reservations")).status()).toBe(401);

  // 10 hours left: the job sends the one reminder.
  const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await db.from("purchases").update({ reserved_until: hoursFromNow(10) }).eq("registry_item_id", item.id);
  expect((await runReservationJob(page)).reminded).toBeGreaterThanOrEqual(1);
  const reminder = await waitForEmail(guestEmail, `Your reservation of "${item.title}" ends soon`);
  linkIn(reminder, /\/gift\/[0-9a-f-]+\?step=confirm$/);

  // A second run the same day doesn't send another.
  await runReservationJob(page);
  const reminders = (await emailsTo(guestEmail)).filter((e) => e.subject === reminder.subject);
  expect(reminders).toHaveLength(1);

  // The hold ran out: the job releases it and tells the guest.
  await db.from("purchases").update({ reserved_until: hoursFromNow(-1) }).eq("registry_item_id", item.id);
  expect((await runReservationJob(page)).released).toBeGreaterThanOrEqual(1);
  const ended = await waitForEmail(guestEmail, `Your reservation of "${item.title}" ended`);
  expect(ended.links).toContain(`${SITE_URL}/r/${registry.slug}`);

  const { data: purchase } = await db.from("purchases").select("status").eq("registry_item_id", item.id).single();
  expect(purchase?.status).toBe("cancelled");

  // The item is back on the list for the next guest, and the owners never
  // heard about a gift that didn't happen.
  await page.goto(`/r/${registry.slug}`);
  await expect(page.getByRole("button", { name: "Gift this" })).toBeVisible();
  expect(await emailsTo(owner.email)).toHaveLength(0);
});
