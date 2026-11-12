// Run with: node --test src/lib/reveal.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDays, formatRevealDate, nextReveal, revealDateFor, revealMomentFor } from "./reveal.ts";
import { fundAsRevealed, isGiftRevealed, itemAsRevealed } from "./gifts.ts";

const christmas = { title: "Christmas", event_date: "2026-12-25" };
const birthday = { title: "Birthday", event_date: "2027-03-02" };

test("gifts are revealed at 12:00 UTC the day after the event", () => {
  assert.equal(revealDateFor("2026-12-25"), "2026-12-26");
  assert.equal(revealDateFor("2026-12-31"), "2027-01-01");
  assert.equal(revealMomentFor("2026-12-25").toISOString(), "2026-12-26T12:00:00.000Z");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("the next reveal is the soonest event not yet revealed", () => {
  const before = new Date("2026-12-26T11:59:00Z");
  assert.deepEqual(nextReveal([birthday, christmas], before), { date: "2026-12-26", event: christmas });
  const after = new Date("2026-12-26T12:00:00Z");
  assert.deepEqual(nextReveal([birthday, christmas], after), { date: "2027-03-03", event: birthday });
  assert.equal(nextReveal([{ title: "No date", event_date: null }], before), null);
});

test("a gift is revealed when it was reserved before the reveal", () => {
  const through = "2026-12-26T12:00:00.000Z";
  assert.equal(isGiftRevealed("2026-12-20T09:00:00Z", through), true);
  assert.equal(isGiftRevealed("2026-12-26T12:00:00Z", through), false);
  assert.equal(isGiftRevealed("2026-12-20T09:00:00Z", null), false);
});

test("an owner's item and fund count only revealed gifts", () => {
  const item = { quantity_needed: 2, quantity_fulfilled: 2, is_parent_purchased: false };
  assert.equal(itemAsRevealed(item, [{ status: "purchased", quantity: 1 }]).quantity_fulfilled, 1);
  assert.equal(itemAsRevealed(item, [{ status: "cancelled", quantity: 1 }]).quantity_fulfilled, 0);
  assert.equal(itemAsRevealed({ ...item, is_parent_purchased: true }, []).quantity_fulfilled, 2);
  assert.equal(fundAsRevealed({ current_amount: 80 }, [{ status: "purchased", amount: "25" }]).current_amount, 25);
});

test("reveal dates are formatted in UTC, with the year only when it isn't this one", () => {
  assert.equal(formatRevealDate("2026-12-26", "2026-11-12"), "Dec 26");
  assert.equal(formatRevealDate("2027-01-01", "2026-11-12"), "Jan 1, 2027");
});

test("the database reveals at the same hour as src/lib/reveal.ts", () => {
  const sql = readFileSync(
    new URL("../../supabase/migrations/20261112063128_everyone_gives_everyone.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /\(e\.event_date \+ 1\)::timestamp \+ interval '12 hours'\) at time zone 'UTC'/);
});
