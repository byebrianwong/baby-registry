// Gift profiles, birthdays and Follow back. Someone's sizes and likes show to
// anyone with their links, but their birthday only to them and the followers
// they approved. Those followers see it coming up on their Following page,
// and get one email 10 days before it. A follower is one tap from following
// back, and two people who follow each other show as Mutual.

import { expect, test, type Page } from "@playwright/test";
import { createAccount, createWishlist, CRON_SECRET, db } from "./fixtures";
import { emailsTo, linkIn, waitForEmail } from "./mailbox";
import { addDays, formatBirthday } from "../src/lib/gift-profile";
import { profilePath } from "../src/lib/profile-link";

/** Today in UTC, the same as the server. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A month and day this many days from today. */
function birthdayIn(days: number) {
  const date = addDays(today(), days);
  return { month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
}

async function follow(followerId: string, followeeId: string, status: "pending" | "approved") {
  const { error } = await db.from("follows").insert({
    follower_id: followerId,
    followee_id: followeeId,
    status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
  });
  if (error) throw error;
}

/** Someone with a birthday, sizes and likes, and one wish list on their profile. */
async function personWithBirthday(name: string, birthday: { month: number; day: number }) {
  const person = await createAccount(name);
  const { error } = await db
    .from("profiles")
    .update({ gift_profile: { birthday, sizes: { tops: "M" }, likes: ["Bubble tea"], skip: ["Candles"] } })
    .eq("id", person.id);
  if (error) throw error;
  const { registry } = await createWishlist(person.id);
  await db.from("registries").update({ listed_on_profile: true }).eq("id", registry.id);
  const { data: profile } = await db.from("profiles").select("public_id, full_name").eq("id", person.id).single();
  return { ...person, registry, path: profilePath(profile!) };
}

async function runBirthdayJob(page: Page) {
  const response = await page.request.get("/api/cron/birthdays", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  return response.json() as Promise<{ birthdays: number; sent: number; failed: number }>;
}

async function signInAs(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/dashboard/);
}

const birthdayEmails = async (address: string) =>
  (await emailsTo(address)).filter((email) => email.subject.includes("birthday"));

test("approved followers get one email 10 days before a birthday", async ({ page }) => {
  const glinda = await personWithBirthday("Glinda Upland", birthdayIn(10));
  const max = await createAccount("Max Friend");
  const oz = await createAccount("Oz Waiting");
  const elphaba = await createAccount("Elphaba Quiet");
  await follow(max.id, glinda.id, "approved");
  await follow(oz.id, glinda.id, "pending");
  await follow(elphaba.id, glinda.id, "approved");
  await db.from("profiles").update({ email_birthday_reminders: false }).eq("id", elphaba.id);

  const first = await runBirthdayJob(page);
  expect(first.sent).toBeGreaterThanOrEqual(1);

  const email = await waitForEmail(max.email, "Glinda Upland's birthday is in 10 days");
  expect(linkIn(email, /\/r\//)).toContain(`/r/${glinda.registry.slug}`);
  expect(linkIn(email, /#birthday-emails$/)).toContain("/dashboard/account");

  // Running again the same day sends nothing new.
  await runBirthdayJob(page);
  await page.waitForTimeout(1500);
  expect(await birthdayEmails(max.email)).toHaveLength(1);
  // A follower waiting for approval, and one who turned the emails off, get none.
  expect(await birthdayEmails(oz.email)).toHaveLength(0);
  expect(await birthdayEmails(elphaba.email)).toHaveLength(0);
});

test("only approved followers see a birthday; anyone with a link sees sizes and likes", async ({ browser }) => {
  const birthday = birthdayIn(5);
  const glinda = await personWithBirthday("Glinda Bubbles", birthday);
  const max = await createAccount("Max Follower");
  await follow(max.id, glinda.id, "approved");

  const maxContext = await browser.newContext();
  const page = await maxContext.newPage();
  await signInAs(page, max);

  // The Following page lists it.
  await page.goto("/dashboard/following");
  const coming = page.getByRole("region", { name: "Birthdays coming up" });
  await expect(coming.getByText("Glinda Bubbles")).toBeVisible();
  await expect(coming.getByText("In 5 days")).toBeVisible();

  // Her profile shows it, with her sizes and likes.
  await page.goto(glinda.path);
  await expect(page.getByRole("heading", { name: "About Glinda Bubbles" })).toBeVisible();
  await expect(page.getByText(formatBirthday(birthday), { exact: true })).toBeVisible();
  await expect(page.getByText("Bubble tea")).toBeVisible();
  await maxContext.close();

  // Someone with only the links sees the sizes and likes, but no birthday.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  for (const path of [glinda.path, `/r/${glinda.registry.slug}`]) {
    await visitorPage.goto(path);
    await expect(visitorPage.getByText("Bubble tea")).toBeVisible();
    await expect(visitorPage.getByText("Tops: M")).toBeVisible();
    await expect(visitorPage.getByText(formatBirthday(birthday), { exact: true })).toHaveCount(0);
    await expect(visitorPage.getByText("Birthday", { exact: true })).toHaveCount(0);
  }
  await visitor.close();
});

test("a follower is one tap from following back, and approving offers it too", async ({ page }) => {
  const glinda = await createAccount("Glinda Host");
  const max = await createAccount("Max Mutual");
  const oz = await createAccount("Oz Asking");
  await follow(max.id, glinda.id, "approved");
  await follow(oz.id, glinda.id, "pending");

  await signInAs(page, glinda);
  await page.goto("/dashboard/account");

  // Max already follows Glinda: one tap sends a request back.
  await page.getByRole("button", { name: "Follow back Max Mutual" }).click();
  await expect(page.getByText("Requested").first()).toBeVisible();
  await expect
    .poll(async () => {
      const { data } = await db
        .from("follows")
        .select("status")
        .eq("follower_id", glinda.id)
        .eq("followee_id", max.id)
        .maybeSingle();
      return data?.status;
    })
    .toBe("pending");

  // Approving Oz's request offers to follow Oz back right there.
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Follow back Oz Asking" }).first()).toBeVisible();

  // Once Max approves Glinda, they follow each other, so Max shows as Mutual
  // in both Followers and Following.
  await db
    .from("follows")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("follower_id", glinda.id)
    .eq("followee_id", max.id);
  await page.reload();
  await expect(page.getByText("Mutual", { exact: true })).toHaveCount(2);
});

test("someone fills in their gift profile on the Account page", async ({ page }) => {
  const maya = await createAccount("Maya Profile");
  await signInAs(page, maya);
  await page.goto("/dashboard/account");

  const form = page.locator("#gift-profile");
  await form.getByLabel("Birthday: month").selectOption("2");
  await form.getByLabel("Birthday: day").selectOption("29");
  await form.getByLabel("Tops").fill("L");
  const likes = form.getByRole("textbox", { name: "Likes" });
  await likes.fill("Puzzles");
  await likes.press("Enter");
  await likes.fill("Tea, hiking,");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByText("Saved")).toBeVisible();

  await expect
    .poll(async () => {
      const { data } = await db.from("profiles").select("gift_profile").eq("id", maya.id).single();
      return data?.gift_profile;
    })
    .toEqual({
      birthday: { month: 2, day: 29 },
      sizes: { tops: "L" },
      likes: ["Puzzles", "Tea", "hiking"],
    });

  // Birthday emails are on until she turns them off, which saves at once.
  const emails = page.getByRole("checkbox", { name: /Email me before birthdays/ });
  await expect(emails).toBeChecked();
  await emails.click({ force: true });
  await expect
    .poll(async () => {
      const { data } = await db.from("profiles").select("email_birthday_reminders").eq("id", maya.id).single();
      return data?.email_birthday_reminders;
    })
    .toBe(false);
});

test("a list kept for a child has its own gift profile, and followers see the child's birthday", async ({ browser }) => {
  const dorothy = await createAccount("Dorothy Parent");
  const henry = await createAccount("Henry Uncle");
  const { registry } = await createWishlist(dorothy.id, { settings: { for_child: true } });
  await db.from("registries").update({ listed_on_profile: true, honoree_names: "Toto" }).eq("id", registry.id);
  await follow(henry.id, dorothy.id, "approved");

  // Dorothy fills in Toto's profile on the list's settings page.
  const dorothyContext = await browser.newContext();
  const page = await dorothyContext.newPage();
  await signInAs(page, dorothy);
  await page.goto(`/dashboard/registry/${registry.id}/settings`);
  const form = page.locator("#gift-profile");
  await expect(form.getByText("About Toto")).toBeVisible();
  const birthday = birthdayIn(3);
  await form.getByLabel("Toto's birthday: month").selectOption(String(birthday.month));
  await form.getByLabel("Toto's birthday: day").selectOption(String(birthday.day));
  await form.getByLabel("Shoes").fill("Toddler 9");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByText("Saved")).toBeVisible();
  await dorothyContext.close();

  // The rest of the list's settings stay as they were.
  await expect
    .poll(async () => {
      const { data } = await db.from("registries").select("settings").eq("id", registry.id).single();
      return data?.settings;
    })
    .toMatchObject({ for_child: true, shipping_address: expect.any(String), gift_profile: { birthday, sizes: { shoes: "Toddler 9" } } });

  // Anyone with the link sees Toto's sizes, not the birthday.
  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(`/r/${registry.slug}`);
  await expect(visitorPage.getByRole("heading", { name: "About Toto" })).toBeVisible();
  await expect(visitorPage.getByText("Shoes: Toddler 9")).toBeVisible();
  await expect(visitorPage.getByText(formatBirthday(birthday), { exact: true })).toHaveCount(0);
  await visitor.close();

  // Henry follows Dorothy, so Toto's birthday is on his Following page.
  const henryContext = await browser.newContext();
  const henryPage = await henryContext.newPage();
  await signInAs(henryPage, henry);
  await henryPage.goto("/dashboard/following");
  const coming = henryPage.getByRole("region", { name: "Birthdays coming up" });
  await expect(coming.getByText("Toto")).toBeVisible();
  await expect(coming.getByText("Dorothy Parent's list")).toBeVisible();
  await henryContext.close();
});
