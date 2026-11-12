// RSVP questions and messages to guests (issue #100): a wedding asks each
// person's meal and the plus-ones' names, the host messages everyone going, a
// new time emails everyone who might come, and the day before, everyone
// going gets a reminder.

import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { CRON_SECRET, createAccount, db, signIn, uniqueEmail, uniqueId } from "./fixtures";
import { emailsTo, waitForEmail } from "./mailbox";
import { dateIn, nextDate } from "../src/lib/event-updates";

const WEDDING_QUESTIONS = [
  { id: "meal", kind: "meal", label: "Meal choice", required: true, options: ["Chicken", "Fish", "Vegetarian"] },
  { id: "plus_ones", kind: "plus_ones", label: "Who's coming with you?", required: true, options: [] },
  { id: "diet", kind: "diet", label: "Allergies or dietary needs", required: false, options: [] },
];

type GuestRow = { name: string; email: string | null; rsvp_status?: string; invited_at?: string | null };

/** An event hosted by the given account, with these guests. Each comes back with their RSVP link. */
async function createEvent(hostId: string, fields: Record<string, unknown>, guests: GuestRow[]) {
  const id = uniqueId();
  const { data: event, error } = await db
    .from("events")
    .insert({ owner_id: hostId, slug: `e2e-event-${id}`, title: `Alex & Sam's Wedding ${id}`, event_type: "wedding", ...fields })
    .select("id, slug, title")
    .single();
  if (error) throw error;
  const now = new Date().toISOString();
  const { data: saved, error: guestError } = await db
    .from("event_guests")
    .insert(
      guests.map((g) => ({
        event_id: event.id,
        name: g.name,
        email: g.email,
        token: randomUUID().replace(/-/g, ""),
        rsvp_status: g.rsvp_status ?? "pending",
        responded_at: (g.rsvp_status ?? "pending") === "pending" ? null : now,
        party_size: g.rsvp_status === "no" ? 0 : 1,
        invited_at: g.invited_at ?? null,
      })),
    )
    .select("id, name, email, token");
  if (guestError) throw guestError;
  return { event, guests: saved.map((g) => ({ ...g, rsvpPath: `/e/${event.slug}?g=${g.token}` })) };
}

async function openRsvp(page: Page, path: string, answer: string) {
  await page.goto(path);
  await expect(async () => {
    await page.getByRole("button", { name: answer }).click();
    await expect(page.getByRole("button", { name: answer })).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
  }).toPass();
}

test("a wedding RSVP asks each person's meal and the plus-one's name, and the host sees the answers", async ({ page, browser }) => {
  const host = await createAccount("Hal Host");
  const annEmail = uniqueEmail("ann");
  const { event, guests } = await createEvent(
    host.id,
    { max_party_size: 2, rsvp_questions: WEDDING_QUESTIONS },
    [{ name: "Ann", email: annEmail }],
  );

  await openRsvp(page, guests[0].rsvpPath, "Going");
  await page.getByLabel("How many people, including you?").selectOption("2");
  // Required answers are checked before anything is sent.
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByRole("alert").filter({ hasText: 'Choose "Meal choice" for each person.' })).toBeVisible();

  await page.getByRole("textbox", { name: "Name of guest 2" }).fill("Sam");
  await page.getByRole("combobox", { name: "For you" }).selectOption("Fish");
  await page.getByRole("combobox", { name: "For Sam" }).selectOption("Chicken");
  await page.getByLabel("Allergies or dietary needs (optional)").fill("No nuts");
  await page.getByRole("button", { name: "Send RSVP" }).click();

  await expect(page.getByRole("heading", { name: "You're going (2 people)" })).toBeVisible();
  await expect(page.getByText("You: Fish, Sam: Chicken")).toBeVisible();
  const { data: saved } = await db.from("event_guests").select("answers").eq("id", guests[0].id).single();
  expect(saved?.answers).toEqual({ meal: ["Fish", "Chicken"], plus_ones: ["Sam"], diet: "No nuts" });

  const confirmation = await waitForEmail(annEmail, `You're going to ${event.title}`);
  expect(confirmation.html).toContain("Your answers:");
  expect(confirmation.html).toContain("You: Fish, Sam: Chicken");
  const notice = await waitForEmail(host.email, `Ann is going to ${event.title}`);
  expect(notice.html).toContain("Ann: Fish, Sam: Chicken");

  // The host sees the meal counts and Ann's answers.
  const hostPage = await (await browser.newContext()).newPage();
  await signIn(hostPage, host);
  await hostPage.goto(`/dashboard/events/${event.id}`);
  await expect(hostPage.getByText("Meal choice, for everyone going")).toBeVisible();
  await expect(hostPage.getByText("Chicken: 1 · Fish: 1 · Vegetarian: 0")).toBeVisible();
  await expect(hostPage.getByText("Ann: Fish, Sam: Chicken")).toBeVisible();
  await hostPage.context().close();
});

test("the host adds a question of their own, and guests must answer it", async ({ page, browser }) => {
  const host = await createAccount("Hal Host");
  const { event, guests } = await createEvent(host.id, { event_type: "birthday", max_party_size: 1 }, [
    { name: "Ann", email: uniqueEmail("ann") },
  ]);

  const hostPage = await (await browser.newContext()).newPage();
  await signIn(hostPage, host);
  await hostPage.goto(`/dashboard/events/${event.id}/edit`);
  await expect(async () => {
    await hostPage.getByRole("button", { name: "Your own question" }).click();
    await expect(hostPage.getByRole("textbox", { name: "Question", exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await hostPage.getByRole("textbox", { name: "Question", exact: true }).fill("What song gets you dancing?");
  await hostPage.getByRole("checkbox", { name: "Guests must answer" }).click({ force: true });
  await hostPage.getByRole("button", { name: "Save changes" }).click();
  await hostPage.waitForURL(`**/dashboard/events/${event.id}`);
  const { data: saved } = await db.from("events").select("rsvp_questions").eq("id", event.id).single();
  expect(saved?.rsvp_questions).toMatchObject([{ kind: "text", label: "What song gets you dancing?", required: true }]);
  await hostPage.context().close();

  await openRsvp(page, guests[0].rsvpPath, "Going");
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByRole("alert").filter({ hasText: 'Answer "What song gets you dancing?".' })).toBeVisible();
  await page.getByLabel("What song gets you dancing?").fill("September");
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByText("What song gets you dancing?: September")).toBeVisible();
});

test("a new time emails everyone who might come, unless the host unticks it", async ({ page }) => {
  const host = await createAccount("Hal Host");
  const emails = { yes: uniqueEmail("yes"), maybe: uniqueEmail("maybe"), invited: uniqueEmail("invited"), no: uniqueEmail("no"), notSent: uniqueEmail("notsent") };
  const invitedAt = new Date().toISOString();
  const { event } = await createEvent(
    host.id,
    {
      event_type: "birthday",
      event_date: "2027-03-14",
      start_time: "14:00",
      time_zone: "America/Los_Angeles",
      location_name: "The park",
    },
    [
      { name: "Yes", email: emails.yes, rsvp_status: "yes", invited_at: invitedAt },
      { name: "Maybe", email: emails.maybe, rsvp_status: "maybe", invited_at: invitedAt },
      { name: "Invited", email: emails.invited, invited_at: invitedAt },
      { name: "No", email: emails.no, rsvp_status: "no", invited_at: invitedAt },
      { name: "Not sent", email: emails.notSent },
    ],
  );

  await signIn(page, host);
  await page.goto(`/dashboard/events/${event.id}/edit`);
  // Typing before the page's scripts load changes nothing, so try until the form notices.
  await expect(async () => {
    await page.getByLabel("Starts").fill("15:30");
    await expect(page.getByRole("checkbox", { name: /Email guests about the new time/ })).toBeChecked({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(`**/dashboard/events/${event.id}`);

  const subject = `New time: ${event.title}`;
  for (const to of [emails.yes, emails.maybe, emails.invited]) {
    const email = await waitForEmail(to, subject);
    expect(email.html).toContain("3:30 PM");
    expect(email.html).toContain("was 2 PM");
    expect(email.replyTo).toEqual([host.email]);
  }
  for (const to of [emails.no, emails.notSent]) {
    expect((await emailsTo(to)).map((e) => e.subject)).not.toContain(subject);
  }
  // The change is logged once the emails are out.
  await expect(async () => {
    await page.reload();
    await expect(page.getByText("New details ·")).toBeVisible({ timeout: 1000 });
  }).toPass();

  // A small fix with the box unticked emails nobody.
  await page.goto(`/dashboard/events/${event.id}/edit`);
  await expect(async () => {
    await page.getByRole("textbox", { name: "Place", exact: true }).fill("The park by the lake");
    await expect(page.getByRole("checkbox", { name: /Email guests about the new place/ })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole("checkbox", { name: /Email guests about the new place/ }).click({ force: true });
  await expect(page.getByRole("checkbox", { name: /Email guests about the new place/ })).not.toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(`**/dashboard/events/${event.id}`);
  await page.waitForTimeout(3000);
  expect((await emailsTo(emails.yes)).map((e) => e.subject)).not.toContain(`New place: ${event.title}`);
  const { count } = await db.from("event_messages").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  expect(count).toBe(1);
});

test("the host messages everyone going, and replies go to the host", async ({ page }) => {
  const host = await createAccount("Hal Host");
  const yes = uniqueEmail("yes");
  const maybe = uniqueEmail("maybe");
  const { event } = await createEvent(host.id, { event_type: "birthday" }, [
    { name: "Yes", email: yes, rsvp_status: "yes" },
    { name: "Maybe", email: maybe, rsvp_status: "maybe" },
  ]);

  await signIn(page, host);
  await page.goto(`/dashboard/events/${event.id}`);
  const dialog = page.getByRole("dialog");
  await expect(async () => {
    await page.getByRole("button", { name: "Message everyone going" }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(dialog.getByRole("combobox", { name: "Send to" })).toHaveValue("going");
  await dialog.getByRole("textbox", { name: "Message" }).fill("Parking is behind the building.");
  await dialog.getByRole("button", { name: "Send to 1 guest" }).click();
  await expect(dialog).toBeHidden();

  const email = await waitForEmail(yes, `About ${event.title}`);
  expect(email.html).toContain("Parking is behind the building.");
  expect(email.replyTo).toEqual([host.email]);
  expect(email.from).toContain("Hal Host via Regibee");
  expect((await emailsTo(maybe)).map((e) => e.subject)).not.toContain(`About ${event.title}`);
  await expect(page.getByText(`About ${event.title}`)).toBeVisible();
});

test("the day before, everyone going gets one reminder", async ({ page }) => {
  const host = await createAccount("Hal Host");
  const tomorrow = nextDate(dateIn("America/Los_Angeles"));
  const yes = uniqueEmail("yes");
  const maybe = uniqueEmail("maybe");
  const { event } = await createEvent(
    host.id,
    { event_type: "birthday", event_date: tomorrow, start_time: "14:00", time_zone: "America/Los_Angeles", location_name: "The park" },
    [
      { name: "Yes", email: yes, rsvp_status: "yes" },
      { name: "Maybe", email: maybe, rsvp_status: "maybe" },
    ],
  );
  // Another event tomorrow whose host turned the reminder off.
  const offEmail = uniqueEmail("off");
  await createEvent(
    host.id,
    { event_type: "birthday", event_date: tomorrow, time_zone: "America/Los_Angeles", remind_day_before: false },
    [{ name: "Off", email: offEmail, rsvp_status: "yes" }],
  );

  expect((await page.request.get("/api/cron/event-reminders")).status()).toBe(401);
  const run = () =>
    page.request.get("/api/cron/event-reminders", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  const first = await run();
  expect(first.status()).toBe(200);

  const reminder = await waitForEmail(yes, `Tomorrow: ${event.title}`);
  expect(reminder.html).toContain("is tomorrow");
  expect(reminder.html).toContain("The park");
  expect(reminder.replyTo).toEqual([host.email]);
  expect((await emailsTo(maybe)).map((e) => e.subject)).not.toContain(`Tomorrow: ${event.title}`);
  expect(await emailsTo(offEmail)).toHaveLength(0);

  // Running again sends nothing new.
  await run();
  expect((await emailsTo(yes)).filter((e) => e.subject === `Tomorrow: ${event.title}`)).toHaveLength(1);
});

test("a wedding from the New button starts with plus-one, meal and diet questions", async ({ page }) => {
  const host = await createAccount("Hal Host");
  await signIn(page, host);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "New", exact: true }).click();
  await expect(async () => {
    await page.getByRole("button", { name: "Wedding", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What are you planning?" })).toBeHidden({ timeout: 1000 });
  }).toPass();
  await page.getByLabel("Your names").fill("Alex & Sam");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /Decide later/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Make the event" }).click();
  await page.waitForURL(/\/dashboard\/events\/[0-9a-f-]{36}$/);
  const eventId = page.url().split("/dashboard/events/")[1];
  const { data } = await db.from("events").select("rsvp_questions, remind_day_before").eq("id", eventId).single();
  expect(data?.remind_day_before).toBe(true);
  expect((data?.rsvp_questions as { kind: string; required: boolean }[]).map((q) => [q.kind, q.required])).toEqual([
    ["plus_ones", true],
    ["meal", true],
    ["diet", false],
  ]);
});
