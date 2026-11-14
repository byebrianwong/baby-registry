// Run with: node --test src/lib/gift-profile.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TAGS,
  addDays,
  birthdayCountdown,
  daysBetween,
  formatBirthdayDate,
  hasGiftDetails,
  nextAnnualDate,
  pickBirthdayList,
  parseGiftProfile,
  withoutBirthday,
} from "./gift-profile.ts";

test("parseGiftProfile keeps clean values and drops the rest", () => {
  assert.deepEqual(
    parseGiftProfile({
      birthday: { month: "3", day: 3 },
      sizes: { tops: "  M ", bottoms: "", shoes: 9, hats: "L" },
      colors: "  green,   gold ",
      likes: ["Tea", "tea", " ", "Puzzles"],
      skip: "candles, mugs,,",
      notes: "  Line one  \n\n\n\nLine two ",
      extra: "ignored",
    }),
    {
      birthday: { month: 3, day: 3 },
      sizes: { tops: "M" },
      colors: "green, gold",
      likes: ["Tea", "Puzzles"],
      skip: ["candles", "mugs"],
      notes: "Line one\n\nLine two",
    },
  );
});

test("parseGiftProfile turns anything that isn't an object into an empty profile", () => {
  assert.deepEqual(parseGiftProfile(null), {});
  assert.deepEqual(parseGiftProfile("birthday"), {});
  assert.deepEqual(parseGiftProfile([1, 2]), {});
});

test("birthdays need a real month and day, February 29 included", () => {
  assert.deepEqual(parseGiftProfile({ birthday: { month: 2, day: 29 } }).birthday, { month: 2, day: 29 });
  assert.equal(parseGiftProfile({ birthday: { month: 2, day: 30 } }).birthday, undefined);
  assert.equal(parseGiftProfile({ birthday: { month: 4, day: 31 } }).birthday, undefined);
  assert.equal(parseGiftProfile({ birthday: { month: 13, day: 1 } }).birthday, undefined);
  assert.equal(parseGiftProfile({ birthday: { month: 1.5, day: 1 } }).birthday, undefined);
});

test("tags stop at the limit", () => {
  const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `Thing ${i}`);
  assert.equal(parseGiftProfile({ likes: many }).likes?.length, MAX_TAGS);
});

test("a birthday alone isn't a gift detail, and withoutBirthday removes it", () => {
  const profile = parseGiftProfile({ birthday: { month: 6, day: 1 } });
  assert.equal(hasGiftDetails(profile), false);
  assert.equal(hasGiftDetails({ ...profile, likes: ["Tea"] }), true);
  assert.deepEqual(withoutBirthday({ ...profile, likes: ["Tea"] }), { likes: ["Tea"] });
});

test("nextAnnualDate finds this year's date, or next year's once it's passed", () => {
  assert.equal(nextAnnualDate({ month: 3, day: 3 }, "2026-01-10"), "2026-03-03");
  assert.equal(nextAnnualDate({ month: 3, day: 3 }, "2026-03-03"), "2026-03-03");
  assert.equal(nextAnnualDate({ month: 3, day: 3 }, "2026-03-04"), "2027-03-03");
  assert.equal(nextAnnualDate({ month: 1, day: 2 }, "2026-12-31"), "2027-01-02");
});

test("a February 29 birthday falls on February 28 outside leap years", () => {
  assert.equal(nextAnnualDate({ month: 2, day: 29 }, "2027-02-01"), "2027-02-28");
  assert.equal(nextAnnualDate({ month: 2, day: 29 }, "2027-03-01"), "2028-02-29");
  assert.equal(nextAnnualDate({ month: 2, day: 29 }, "2028-01-01"), "2028-02-29");
});

test("date helpers count across months and years", () => {
  assert.equal(addDays("2026-12-25", 10), "2027-01-04");
  assert.equal(addDays("2028-02-20", 10), "2028-03-01");
  assert.equal(daysBetween("2026-12-25", "2027-01-04"), 10);
  assert.equal(birthdayCountdown("2026-03-03", "2026-03-03"), "Today");
  assert.equal(birthdayCountdown("2026-03-04", "2026-03-03"), "Tomorrow");
  assert.equal(birthdayCountdown("2026-03-13", "2026-03-03"), "In 10 days");
  assert.equal(formatBirthdayDate("2026-03-03"), "Tuesday, March 3");
});

test("pickBirthdayList links one current wish list, or the one birthday list", () => {
  const today = "2026-03-01";
  const list = (slug: string, extra: Partial<Parameters<typeof pickBirthdayList>[0][number]> = {}) => ({
    slug,
    registry_type: "personal",
    event_type: null,
    event_date: null,
    ...extra,
  });
  assert.equal(pickBirthdayList([list("a")], today)?.slug, "a");
  // A past event, a baby registry and a child's list don't count.
  assert.equal(
    pickBirthdayList(
      [
        list("a"),
        list("past", { event_date: "2026-01-01" }),
        list("baby", { registry_type: "baby" }),
        list("kid", { for_child: true }),
      ],
      today,
    )?.slug,
    "a",
  );
  assert.equal(
    pickBirthdayList([list("a"), list("bday", { event_type: "birthday", event_date: "2026-03-03" })], today)?.slug,
    "bday",
  );
  assert.equal(pickBirthdayList([list("a"), list("b")], today), null);
  assert.equal(pickBirthdayList([], today), null);
});
