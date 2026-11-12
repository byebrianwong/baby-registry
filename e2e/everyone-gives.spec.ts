// "Everyone gives everyone" events: a family Christmas where every guest
// links a wish list. Guests see each other's lists and which of the other
// guests reserved what, never on their own list. A list that hides what's
// been reserved from its owner shows them the gifts, and who gave them, from
// the day after the event, with one email.

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createAccount, createWishlist, db, reserveGift, runReservationJob, signIn, SITE_URL, uniqueId } from "./fixtures";
import { localSupabase } from "./local-supabase";
import { waitForEmail } from "./mailbox";

/** An everyone-gives-everyone event hosted by the given account, with these guests on its list. */
async function createEveryoneEvent(hostId: string, guests: { name: string; email: string }[]) {
  const id = uniqueId();
  const { data: event, error } = await db
    .from("events")
    .insert({
      owner_id: hostId,
      slug: `e2e-family-${id}`,
      event_type: "christmas",
      title: `Family Christmas ${id}`,
      event_date: "2099-12-25",
    })
    .select("id, slug, title")
    .single();
  if (error) throw error;
  const { error: exchangeError } = await db.from("gift_exchanges").insert({ event_id: event.id, kind: "everyone", budget: "$30" });
  if (exchangeError) throw exchangeError;
  const rows = guests.map((g) => ({ event_id: event.id, name: g.name, email: g.email, token: randomUUID().replace(/-/g, "") }));
  const { data: saved, error: guestError } = await db.from("event_guests").insert(rows).select("id, name, token");
  if (guestError) throw guestError;
  return { event, guests: saved.map((g) => ({ ...g, rsvpPath: `/e/${event.slug}?g=${g.token}` })) };
}

/** RSVPs "Going" from a guest's own link, with a pasted wish list link or none. */
async function rsvpWithList(page: Page, rsvpPath: string, wishlistUrl: string | null) {
  await page.goto(rsvpPath);
  await page.getByRole("button", { name: "Going" }).click();
  if (wishlistUrl) await page.getByLabel(/Link to your wish list/).fill(wishlistUrl);
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await expect(page.getByText(/You're going/)).toBeVisible();
}

/** The purchases on a list that its owner can read with the anon key, as the mobile app does. */
async function purchasesOwnerCanRead(account: { email: string; password: string }, registryId: string) {
  const client = createClient(localSupabase().apiUrl, localSupabase().anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error) throw error;
  const { data, error: readError } = await client
    .from("purchases")
    .select("id, buyer_name, registry_items!registry_item_id!inner(registry_id)")
    .eq("registry_items.registry_id", registryId);
  if (readError) throw readError;
  return data ?? [];
}

test("guests see each other's lists and who reserved what, and the owner sees it the day after", async ({ browser }) => {
  const maya = await createAccount("Maya Owner");
  const ben = await createAccount("Ben Brother");
  const hal = await createAccount("Hal Host");
  const { registry: mayaList, item: scarf } = await createWishlist(maya.id);
  const { registry: benList } = await createWishlist(ben.id);
  const { event, guests } = await createEveryoneEvent(hal.id, [
    { name: "Maya", email: maya.email },
    { name: "Ben", email: ben.email },
    { name: "Cleo", email: `cleo-${uniqueId()}@example.com` },
  ]);
  const [mayaGuest, benGuest, cleoGuest] = guests;

  // Maya and Ben RSVP with their lists. Maya's list starts hiding what's
  // reserved from her, so her gifts stay a surprise.
  const mayaContext = await browser.newContext();
  await rsvpWithList(await mayaContext.newPage(), mayaGuest.rsvpPath, `${SITE_URL}/r/${mayaList.slug}`);
  await mayaContext.close();
  const benContext = await browser.newContext();
  const benPage = await benContext.newPage();
  await rsvpWithList(benPage, benGuest.rsvpPath, `${SITE_URL}/r/${benList.slug}`);
  const { data: mayaSettings } = await db.from("registries").select("settings").eq("id", mayaList.id).single();
  expect(mayaSettings?.settings).toMatchObject({ hide_reservations: true });

  // Ben sees everyone's lists, opens Maya's from the invitation and reserves the scarf.
  const lists = benPage.getByRole("region", { name: "Everyone's wish lists" });
  await expect(lists.getByText(mayaList.title)).toBeVisible();
  await lists.getByRole("link", { name: "See Maya's list" }).click();
  await benPage.waitForURL(`**/r/${mayaList.slug}`);
  await expect(benPage.getByText(`You're shopping as a guest of ${event.title}`)).toBeVisible();
  await reserveGift(benPage, { slug: mayaList.slug, name: "Ben Brother", email: ben.email });
  await benContext.close();

  // Cleo, another guest, sees that Ben reserved it.
  const cleoContext = await browser.newContext();
  const cleoPage = await cleoContext.newPage();
  await rsvpWithList(cleoPage, cleoGuest.rsvpPath, null);
  await cleoPage
    .getByRole("region", { name: "Everyone's wish lists" })
    .getByRole("link", { name: "See Maya's list" })
    .click();
  await cleoPage.waitForURL(`**/r/${mayaList.slug}`);
  await expect(cleoPage.getByText("Reserved by Ben")).toBeVisible();
  await cleoContext.close();

  // Someone with the plain list link sees it's taken, but not by whom.
  const strangerContext = await browser.newContext();
  const strangerPage = await strangerContext.newPage();
  await strangerPage.goto(`/r/${mayaList.slug}`);
  await expect(strangerPage.getByText(scarf.title)).toBeVisible();
  await expect(strangerPage.getByText("Reserved by Ben")).toHaveCount(0);
  await strangerContext.close();

  // Maya can't read the reservation at all, not even with the anon key.
  expect(await purchasesOwnerCanRead(maya, mayaList.id)).toHaveLength(0);
  const mayaSignedIn = await browser.newContext();
  const mayaPage = await mayaSignedIn.newPage();
  await signIn(mayaPage, maya);
  await mayaPage.goto(`/dashboard/registry/${mayaList.id}?tab=purchases`);
  await expect(mayaPage.getByText(`Gifts reserved before ${event.title} are revealed`).first()).toBeVisible();
  await expect(mayaPage.getByText("Ben Brother")).toHaveCount(0);

  // The event is over: move it back two days, and the reservation to before it.
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  await db.from("events").update({ event_date: twoDaysAgo }).eq("id", event.id);
  await db.from("purchases").update({ created_at: fourDaysAgo }).eq("registry_item_id", scarf.id);

  // The daily job reveals it and emails Maya once.
  const first = (await runReservationJob(mayaPage)) as unknown as { reveals: { revealed: number; emailed: number } };
  expect(first.reveals.emailed).toBeGreaterThanOrEqual(1);
  await waitForEmail(maya.email, `🎁 Your gifts from ${event.title} are revealed`);
  const second = (await runReservationJob(mayaPage)) as unknown as { reveals: { revealed: number; emailed: number } };
  const { count } = await db
    .from("gift_reveals")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("registry_id", mayaList.id);
  expect(count).toBe(1);
  expect(second.reveals).toBeDefined();

  // Now Maya sees who gave what, on her page and with the anon key.
  const readable = await purchasesOwnerCanRead(maya, mayaList.id);
  expect(readable.map((p) => p.buyer_name)).toEqual(["Ben Brother"]);
  await mayaPage.goto(`/dashboard/registry/${mayaList.id}?tab=purchases`);
  await expect(mayaPage.getByText("Ben Brother").first()).toBeVisible();
  await mayaSignedIn.close();
});
