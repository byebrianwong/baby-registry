// Run with: node --test src/lib/group-gifts.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupGiftProgress,
  groupGiftReservationName,
  groupGiftStatus,
  groupGiftUrl,
  isGroupGiftToken,
  parseGroupGiftAmount,
} from "./group-gifts.ts";
import { GROUP_GIFT_HOLD_DAYS, isHeldUntilBought } from "./gifts.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("amounts people type become dollars and cents", () => {
  assert.equal(parseGroupGiftAmount("40"), 40);
  assert.equal(parseGroupGiftAmount("$37.50"), 37.5);
  assert.equal(parseGroupGiftAmount(" 1,200 "), 1200);
  assert.equal(parseGroupGiftAmount("19.999"), 20);
  assert.equal(parseGroupGiftAmount(25), 25);
});

test("anything else isn't an amount", () => {
  for (const value of ["", "  ", "0", "-5", "abc", "1e3", "12.3.4", "100001", null, undefined, NaN, Infinity]) {
    assert.equal(parseGroupGiftAmount(value), null, String(value));
  }
});

test("a group gift's status comes from its reservation", () => {
  assert.equal(groupGiftStatus({ status: "reserved" }), "open");
  assert.equal(groupGiftStatus({ status: "purchased" }), "bought");
  assert.equal(groupGiftStatus({ status: "cancelled" }), "ended");
  assert.equal(groupGiftStatus(null), "ended");
});

test("the owner sees the organizer's first name and others", () => {
  assert.equal(groupGiftReservationName("Oz Organizer"), "Oz and others");
  assert.equal(groupGiftReservationName("  Glinda  "), "Glinda and others");
  assert.equal(groupGiftReservationName(null), "Friends and others");
});

test("progress stops at the goal", () => {
  assert.deepEqual(groupGiftProgress(80, 120), { percent: 67, toGo: 40 });
  assert.deepEqual(groupGiftProgress(150, 120), { percent: 100, toGo: 0 });
  assert.deepEqual(groupGiftProgress(80, null), { percent: 0, toGo: 0 });
});

test("only the pledger's own link carries their pledge token", () => {
  assert.equal(groupGiftUrl("https://regibee.com", "abc_DEF-123456789012345"), "https://regibee.com/group-gift/abc_DEF-123456789012345");
  assert.equal(
    groupGiftUrl("https://regibee.com", "abc_DEF-123456789012345", "zzz_YYY-123456789012345"),
    "https://regibee.com/group-gift/abc_DEF-123456789012345?p=zzz_YYY-123456789012345",
  );
  assert.equal(isGroupGiftToken("abc_DEF-123456789012345"), true);
  assert.equal(isGroupGiftToken("short"), false);
  assert.equal(isGroupGiftToken("has spaces in it, not a token"), false);
});

test("a group gift's reservation shows no end date, an ordinary one does", () => {
  const now = Date.now();
  const groupGift = { status: "reserved", reserved_until: new Date(now + GROUP_GIFT_HOLD_DAYS * DAY_MS).toISOString() };
  const ordinary = { status: "reserved", reserved_until: new Date(now + 2 * DAY_MS).toISOString() };
  const longest = { status: "reserved", reserved_until: new Date(now + 30 * DAY_MS).toISOString() };
  assert.equal(isHeldUntilBought(groupGift, now), true);
  assert.equal(isHeldUntilBought(ordinary, now), false);
  assert.equal(isHeldUntilBought(longest, now), false);
  assert.equal(isHeldUntilBought({ ...groupGift, status: "purchased" }, now), false);
});
