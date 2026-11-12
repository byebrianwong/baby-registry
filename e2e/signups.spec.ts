// Sign-up sheets (issue #99): potlucks, meal trains and volunteer slots.
// Guests claim rows from their RSVP link with no account, the host sees the
// claims on the guest list, two guests can't both take the last spot, and a
// meal train shows its drop-off address only to people who signed up.

import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createAccount, db, signIn, uniqueEmail, uniqueId } from "./fixtures";
import { emailsTo, waitForEmail } from "./mailbox";

const DROP_OFF = "77 Linden Way\nOakland, CA 94610";

/**
 * An event with a sign-up sheet and these rows, hosted by the given account,
 * with these guests on its list. Each guest comes back with their RSVP link.
 */
async function createSignupEvent(opts: {
  hostId: string;
  eventType?: string;
  title?: string;
  locationAddress?: string | null;
  rows: { label: string; needed: number; slot_date?: string | null }[];
  guests: { name: string; email: string | null }[];
}) {
  const id = uniqueId();
  const { data: event, error } = await db
    .from("events")
    .insert({
      owner_id: opts.hostId,
      slug: `e2e-signup-${id}`,
      event_type: opts.eventType ?? "potluck",
      title: `${opts.title ?? "Friendsgiving"} ${id}`,
      location_address: opts.locationAddress ?? null,
    })
    .select("id, slug, title")
    .single();
  if (error) throw error;
  const { error: sheetError } = await db.from("signup_sheets").insert({ event_id: event.id, title: "Bring a dish" });
  if (sheetError) throw sheetError;
  const { data: items, error: itemError } = await db
    .from("signup_items")
    .insert(opts.rows.map((row, index) => ({ event_id: event.id, ...row, sort_order: index })))
    .select("id, label, slot_date");
  if (itemError) throw itemError;
  const { data: guests, error: guestError } = await db
    .from("event_guests")
    .insert(opts.guests.map((g) => ({ event_id: event.id, name: g.name, email: g.email, token: randomUUID().replace(/-/g, "") })))
    .select("id, name, email, token");
  if (guestError) throw guestError;
  return {
    event,
    items,
    guests: guests.map((g) => ({ ...g, rsvpPath: `/e/${event.slug}?g=${g.token}` })),
  };
}

/**
 * Ticks or unticks a sign-up row. The real checkbox is hidden behind its
 * label, so the click is forced, as in groups.spec.ts.
 */
async function setRow(page: Page, name: string | RegExp, on: boolean) {
  const box = page.getByRole("checkbox", { name });
  await box.click({ force: true });
  if (on) await expect(box).toBeChecked();
  else await expect(box).not.toBeChecked();
}

async function claimsOn(itemId: string) {
  const { data } = await db.from("signup_claims").select("guest_id, note").eq("item_id", itemId);
  return data ?? [];
}

/** Opens a guest's link and waits until the RSVP form can be used. */
async function openRsvp(page: Page, path: string, answer: string) {
  await page.goto(path);
  // A click that lands before the page's scripts load does nothing, so try until the answer sticks.
  await expect(async () => {
    await page.getByRole("button", { name: answer }).click();
    await expect(page.getByRole("button", { name: answer })).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
}

test("a guest signs up to bring a side from their RSVP, and the host sees it", async ({ page, browser }) => {
  const host = await createAccount("Hal Host");
  const annEmail = uniqueEmail("ann");
  const { event, items, guests } = await createSignupEvent({
    hostId: host.id,
    rows: [
      { label: "Main dish", needed: 2 },
      { label: "Side", needed: 3 },
    ],
    guests: [{ name: "Ann", email: annEmail }],
  });
  const side = items.find((i) => i.label === "Side")!;

  await openRsvp(page, guests[0].rsvpPath, "Going");
  await expect(page.getByRole("heading", { name: "Bring a dish" })).toBeVisible();
  await setRow(page, "Side", true);
  await page.getByRole("textbox", { name: "What you're bringing for Side" }).fill("Mac and cheese");
  await page.getByRole("button", { name: "Send RSVP" }).click();

  await expect(page.getByRole("heading", { name: "You're going" })).toBeVisible();
  await expect(page.getByText("Side (Mac and cheese)")).toBeVisible();
  expect(await claimsOn(side.id)).toEqual([{ guest_id: guests[0].id, note: "Mac and cheese" }]);

  // Both emails say what she's bringing.
  const confirmation = await waitForEmail(annEmail, `You're going to ${event.title}`);
  expect(confirmation.html).toContain("You signed up for:");
  expect(confirmation.html).toContain("Side (Mac and cheese)");
  const notice = await waitForEmail(host.email, `Ann is going to ${event.title}`);
  expect(notice.html).toContain("Side (Mac and cheese)");

  // The host sees her on the sheet and on the guest list.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await signIn(hostPage, host);
  await hostPage.goto(`/dashboard/events/${event.id}`);
  const sheet = hostPage.getByRole("region", { name: "Bring a dish" });
  await expect(sheet.getByText("1 of 5 spots taken")).toBeVisible();
  await expect(sheet.getByText("Mac and cheese")).toBeVisible();
  await expect(hostPage.getByText("Signed up for: Side (Mac and cheese)")).toBeVisible();

  // Saying she can't go after all frees the spot.
  await page.getByRole("button", { name: "Change RSVP or sign-ups" }).click();
  await page.getByRole("button", { name: "Can't go" }).click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByRole("heading", { name: "You can't make it" })).toBeVisible();
  expect(await claimsOn(side.id)).toEqual([]);
  await hostContext.close();
});

test("two guests can't both take the last spot", async ({ browser }) => {
  const host = await createAccount("Hal Host");
  const { items, guests } = await createSignupEvent({
    hostId: host.id,
    rows: [{ label: "Dessert", needed: 1 }],
    guests: [
      { name: "Ann", email: uniqueEmail("ann") },
      { name: "Ben", email: uniqueEmail("ben") },
    ],
  });
  const pages = await Promise.all(
    guests.map(async (guest) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openRsvp(page, guest.rsvpPath, "Going");
      await setRow(page, "Dessert", true);
      return page;
    }),
  );

  // Both press Send at the same moment.
  await Promise.all(pages.map((page) => page.getByRole("button", { name: "Send RSVP" }).click()));

  const outcomes = await Promise.all(
    pages.map(async (page) => {
      const won = page.getByRole("heading", { name: "You're going" });
      const lost = page.getByRole("alert").filter({ hasText: "Dessert just filled up" });
      await expect(won.or(lost)).toBeVisible();
      return (await won.isVisible()) ? "won" : "lost";
    }),
  );
  expect([...outcomes].sort()).toEqual(["lost", "won"]);
  expect(await claimsOn(items[0].id)).toHaveLength(1);

  // The one who lost can still RSVP without it.
  const loser = pages[outcomes.indexOf("lost")];
  await setRow(loser, "Dessert", false);
  await loser.getByRole("button", { name: "Send RSVP" }).click();
  await expect(loser.getByRole("heading", { name: "You're going" })).toBeVisible();
  await Promise.all(pages.map((page) => page.context().close()));
});

test("many claims at once never fill a row past what it needs", async () => {
  const host = await createAccount("Hal Host");
  const { event, items, guests } = await createSignupEvent({
    hostId: host.id,
    rows: [{ label: "Drinks", needed: 2 }],
    guests: Array.from({ length: 8 }, (_, i) => ({ name: `Guest ${i + 1}`, email: null })),
  });
  // The same database function the RSVP uses, called for all eight at once.
  const results = await Promise.all(
    guests.map((guest) =>
      db.rpc("save_signup_claims", {
        p_event_id: event.id,
        p_guest_id: guest.id,
        p_claims: [{ item_id: items[0].id, note: null }],
      }),
    ),
  );
  for (const result of results) expect(result.error).toBeNull();
  expect(results.filter((r) => r.data === null)).toHaveLength(2);
  expect(results.filter((r) => r.data === items[0].id)).toHaveLength(6);
  expect(await claimsOn(items[0].id)).toHaveLength(2);
});

test("a meal train shows the drop-off address only to people who signed up", async ({ page, browser }) => {
  const host = await createAccount("Hal Host");
  const annEmail = uniqueEmail("ann");
  const benEmail = uniqueEmail("ben");
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { event, items, guests } = await createSignupEvent({
    hostId: host.id,
    eventType: "meal_train",
    title: "Meals for the Parks",
    locationAddress: DROP_OFF,
    rows: [{ label: "Dinner", needed: 1, slot_date: nextWeek }],
    guests: [
      { name: "Ann", email: annEmail },
      { name: "Ben", email: benEmail },
    ],
  });

  // The host emails the invitations. They don't have the address.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await signIn(hostPage, host);
  await hostPage.goto(`/dashboard/events/${event.id}`);
  await hostPage.getByRole("button", { name: "Send invitations" }).click();
  await hostPage.getByRole("button", { name: "Send", exact: true }).click();
  const invitation = await waitForEmail(annEmail, `You're invited: ${event.title}`);
  expect(invitation.html).toContain("Pick a day");
  expect(invitation.html).not.toContain("Linden Way");

  // Before signing up: no address on the page or in the calendar file.
  await openRsvp(page, guests[0].rsvpPath, "I can help");
  await expect(page.getByText("The drop-off address shows here once you sign up for a day.")).toBeVisible();
  await expect(page.getByText("77 Linden Way")).toHaveCount(0);
  const ics = await page.request.get(`/e/${event.slug}/calendar`);
  expect(await ics.text()).not.toContain("Linden");

  // "I can help" needs a day.
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pick at least one day you can help." })).toBeVisible();
  await setRow(page, /Dinner/, true);
  await page.getByRole("textbox", { name: /What you're making for/ }).fill("Lasagna");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're signed up to help" })).toBeVisible();
  await expect(page.getByText("77 Linden Way")).toBeVisible();
  expect(await claimsOn(items[0].id)).toEqual([{ guest_id: guests[0].id, note: "Lasagna" }]);

  const confirmation = await waitForEmail(annEmail, `You're signed up: ${event.title}`);
  expect(confirmation.html).toContain("77 Linden Way");

  // Ben, who can't help, never gets it.
  const benPage = await (await browser.newContext()).newPage();
  await openRsvp(benPage, guests[1].rsvpPath, "Not this time");
  await benPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(benPage.getByRole("heading", { name: "You're sitting this one out" })).toBeVisible();
  await expect(benPage.getByText("77 Linden Way")).toHaveCount(0);
  await waitForEmail(benEmail, `Your reply for ${event.title}`);
  for (const email of await emailsTo(benEmail)) expect(email.html).not.toContain("Linden Way");

  // The host is told who's bringing what.
  const notice = await waitForEmail(host.email, `Ann signed up to help with ${event.title}`);
  expect(notice.html).toContain("Lasagna");
  await hostContext.close();
  await benPage.context().close();
});

test("a potluck from the New button starts with a sign-up sheet the host can change", async ({ page }) => {
  const host = await createAccount("Hal Host");
  await signIn(page, host);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(async () => {
    await page.getByRole("button", { name: "Potluck", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What are you planning?" })).toBeHidden({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: /A sign-up sheet/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("A sign-up sheet for mains, sides, desserts and drinks.")).toBeVisible();
  await page.getByLabel("Event name").fill("Friendsgiving");
  await page.getByRole("button", { name: "Make the event" }).click();

  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  const eventId = page.url().split("/dashboard/events/")[1];
  const sheet = page.getByRole("region", { name: "Bring a dish" });
  await expect(sheet.getByText("0 of 9 spots taken")).toBeVisible();
  const { data: rows } = await db.from("signup_items").select("label, needed").eq("event_id", eventId).order("sort_order");
  expect(rows).toEqual([
    { label: "Main dish", needed: 2 },
    { label: "Side", needed: 3 },
    { label: "Dessert", needed: 2 },
    { label: "Drinks", needed: 2 },
  ]);

  // The host adds a row.
  await sheet.getByRole("button", { name: "Add a row", exact: true }).click();
  await sheet.getByLabel("What").fill("Ice");
  await sheet.getByLabel("How many").fill("1");
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(sheet.getByText("0 of 10 spots taken")).toBeVisible();
  await expect(sheet.getByText("Ice", { exact: true })).toBeVisible();
});

test("a meal train from the New button starts with a week of dinners", async ({ page }) => {
  const host = await createAccount("Hal Host");
  await signIn(page, host);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(async () => {
    await page.getByRole("button", { name: "Meal train", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What are you planning?" })).toBeHidden({ timeout: 1000 });
  }).toPass();
  await page.getByLabel("Their name").fill("the Parks");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /A sign-up sheet/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Event name")).toHaveValue("Meals for the Parks");
  await page.getByLabel("First day (optional)").fill("2027-01-04");
  await page.getByRole("button", { name: "Make the event" }).click();

  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  const eventId = page.url().split("/dashboard/events/")[1];
  const { data: event } = await db.from("events").select("event_type, event_date").eq("id", eventId).single();
  expect(event).toEqual({ event_type: "meal_train", event_date: null });
  const { data: rows } = await db.from("signup_items").select("label, slot_date").eq("event_id", eventId).order("slot_date");
  expect(rows?.map((r) => r.slot_date)).toEqual([
    "2027-01-04",
    "2027-01-05",
    "2027-01-06",
    "2027-01-07",
    "2027-01-08",
    "2027-01-09",
    "2027-01-10",
  ]);
  await expect(page.getByRole("region", { name: "Meals" }).getByText("0 of 7 spots taken")).toBeVisible();
});
