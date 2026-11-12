// Run with: node --test src/lib/signups.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SIGNUP_DAYS,
  claimsByGuest,
  cleanSignupRow,
  describeClaim,
  rowIsOpen,
  rowsForDays,
  signupRowsForGuest,
  signupRowsForHost,
  spotsLabel,
  withAddressFor,
  type SignupClaim,
  type SignupItem,
} from "./signups.ts";

function item(id: string, label: string, needed: number, extra: Partial<SignupItem> = {}): SignupItem {
  return { id, event_id: "e1", label, needed, slot_date: null, sort_order: 0, created_at: "2026-11-01T00:00:00Z", ...extra };
}

function claim(itemId: string, guestId: string, note: string | null = null, at = "2026-11-02T00:00:00Z"): SignupClaim {
  return { item_id: itemId, guest_id: guestId, note, created_at: at };
}

test("a row for each day covers both ends, and refuses backwards or too-long ranges", () => {
  assert.deepEqual(rowsForDays("2026-11-30", "2026-12-02", "Dinner"), [
    { label: "Dinner", needed: 1, slot_date: "2026-11-30" },
    { label: "Dinner", needed: 1, slot_date: "2026-12-01" },
    { label: "Dinner", needed: 1, slot_date: "2026-12-02" },
  ]);
  assert.equal(rowsForDays("2026-12-02", "2026-11-30", "Dinner"), null);
  assert.equal(rowsForDays("2026-02-30", "2026-03-01", "Dinner"), null);
  assert.equal(rowsForDays("2026-01-01", "2026-01-31", "Dinner")?.length, MAX_SIGNUP_DAYS);
  assert.equal(rowsForDays("2026-01-01", "2026-02-01", "Dinner"), null);
});

test("rows the host types are trimmed and checked", () => {
  assert.deepEqual(cleanSignupRow({ label: "  Sides ", needed: "3", slot_date: "" }), { label: "Sides", needed: 3, slot_date: null });
  assert.ok("error" in cleanSignupRow({ label: " ", needed: 1 }));
  assert.ok("error" in cleanSignupRow({ label: "Sides", needed: 0 }));
  assert.ok("error" in cleanSignupRow({ label: "Sides", needed: 51 }));
  assert.ok("error" in cleanSignupRow({ label: "Dinner", needed: 1, slot_date: "Tuesday" }));
});

test("guests see spots left and what others bring, never who", () => {
  const data = {
    items: [item("sides", "Side", 3), item("dessert", "Dessert", 1, { sort_order: 1 })],
    claims: [claim("sides", "ann", "Mac and cheese"), claim("sides", "ben", null), claim("dessert", "cy", "Pie")],
  };
  const [sides, dessert] = signupRowsForGuest(data, "ann", "2026-11-10");
  assert.deepEqual(sides, {
    id: "sides",
    label: "Side",
    slotDate: null,
    needed: 3,
    taken: 2,
    mine: { note: "Mac and cheese" },
    bringing: [],
    passed: false,
  });
  assert.deepEqual(dessert.bringing, ["Pie"]);
  assert.equal(JSON.stringify(signupRowsForGuest(data, null, "2026-11-10")).includes("cy"), false);
  assert.equal(rowIsOpen(dessert), false);
  assert.equal(spotsLabel(sides), "1 of 3 left");
  assert.equal(spotsLabel(dessert), "Full");
  assert.equal(spotsLabel({ needed: 3, taken: 0 }), "3 needed");
  assert.equal(spotsLabel({ needed: 1, taken: 0 }), "Open");
});

test("dated rows come first, by date, and a past day can't be taken", () => {
  const data = {
    items: [
      item("drinks", "Drinks", 2, { sort_order: 0 }),
      item("wed", "Dinner", 1, { slot_date: "2026-11-12", sort_order: 2 }),
      item("mon", "Dinner", 1, { slot_date: "2026-11-10", sort_order: 3 }),
    ],
    claims: [],
  };
  const rows = signupRowsForGuest(data, null, "2026-11-11");
  assert.deepEqual(rows.map((r) => r.id), ["mon", "wed", "drinks"]);
  assert.equal(rows[0].passed, true);
  assert.equal(rowIsOpen(rows[0]), false);
  assert.equal(rowIsOpen(rows[1]), true);
});

test("hosts see who signed up, oldest first, and each guest's claims read naturally", () => {
  const data = {
    items: [item("mon", "Dinner", 2, { slot_date: "2026-11-10" }), item("sides", "Side", 3)],
    claims: [
      claim("mon", "ben", "Lasagna", "2026-11-03T00:00:00Z"),
      claim("mon", "ann", null, "2026-11-02T00:00:00Z"),
      claim("sides", "ann", "Salad"),
    ],
  };
  const [mon] = signupRowsForHost(data, [
    { id: "ann", name: "Ann" },
    { id: "ben", name: "Ben" },
  ]);
  assert.deepEqual(mon.claims.map((c) => c.name), ["Ann", "Ben"]);
  const ann = claimsByGuest(data).get("ann")!;
  assert.deepEqual(ann.map(describeClaim), ["Tue, Nov 10: Dinner", "Side (Salad)"]);
});

test("a meal train hides its address until the guest signs up; other events never do", () => {
  const mealTrain = { event_type: "meal_train", location_name: "The Parks", location_address: "1 Elm St" };
  assert.deepEqual(withAddressFor(mealTrain, false), { ...mealTrain, location_name: null, location_address: null });
  assert.equal(withAddressFor(mealTrain, true), mealTrain);
  const potluck = { ...mealTrain, event_type: "potluck" };
  assert.equal(withAddressFor(potluck, false), potluck);
});
