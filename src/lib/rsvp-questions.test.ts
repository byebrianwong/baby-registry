// Run with: node --test src/lib/rsvp-questions.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerLines,
  cleanQuestions,
  defaultQuestions,
  mealCounts,
  readAnswers,
  storedAnswers,
  type RsvpQuestion,
} from "./rsvp-questions.ts";
import {
  changeRecipients,
  changeSummary,
  changedParts,
  dateIn,
  isTomorrowFor,
  messageRecipients,
} from "./event-updates.ts";

const wedding: RsvpQuestion[] = defaultQuestions(["meal", "plus_ones", "diet"]);

test("a wedding asks for a meal and plus-ones' names, and diet is optional", () => {
  assert.deepEqual(
    wedding.map((q) => [q.id, q.required]),
    [
      ["meal", true],
      ["plus_ones", true],
      ["diet", false],
    ],
  );
  assert.deepEqual(wedding[0].options, ["Chicken", "Fish", "Vegetarian"]);
});

test("questions from the form are trimmed, and broken ones refused", () => {
  const cleaned = cleanQuestions([
    { id: "meal", kind: "meal", label: " Dinner ", required: true, options: ["Beef ", "", "Beef", "Veg"] },
    { id: "qsong", kind: "text", label: "Song request", required: "yes" },
  ]);
  assert.ok("questions" in cleaned);
  assert.deepEqual(cleaned.questions, [
    { id: "meal", kind: "meal", label: "Dinner", required: true, options: ["Beef", "Veg"] },
    { id: "qsong", kind: "text", label: "Song request", required: false, options: [] },
  ]);
  assert.ok("error" in cleanQuestions([{ id: "meal", kind: "meal", label: "Dinner", options: ["Only one"] }]));
  assert.ok("error" in cleanQuestions([{ id: "a", kind: "text", label: "" }]));
  assert.ok("error" in cleanQuestions([{ id: "Bad id!", kind: "text", label: "Hi" }]));
  assert.ok("error" in cleanQuestions([{ id: "a", kind: "text", label: "Hi" }, { id: "a", kind: "diet", label: "Diet" }]));
  assert.ok("error" in cleanQuestions([{ id: "a", kind: "shoe_size", label: "Hi" }]));
});

test("each person coming picks a meal, and each plus-one gets a name", () => {
  const ok = readAnswers(wedding, { meal: ["Fish", "Chicken"], plus_ones: [" Sam "], diet: "" }, 2);
  assert.deepEqual(ok, { answers: { meal: ["Fish", "Chicken"], plus_ones: ["Sam"] } });

  assert.match(String((readAnswers(wedding, { meal: ["Fish"], plus_ones: ["Sam"] }, 2) as { error: string }).error), /each person/);
  assert.match(String((readAnswers(wedding, { meal: ["Fish", "Lobster"], plus_ones: ["Sam"] }, 2) as { error: string }).error), /Choose one/);
  assert.match(String((readAnswers(wedding, { meal: ["Fish", "Fish"], plus_ones: [""] }, 2) as { error: string }).error), /name/);
  // Alone, nobody's asked for a plus-one's name.
  assert.deepEqual(readAnswers(wedding, { meal: ["Fish"] }, 1), { answers: { meal: ["Fish"] } });
});

test("answers read naturally, naming each person's meal", () => {
  const answers = { meal: ["Fish", "Chicken"], plus_ones: ["Sam"], diet: "No nuts" };
  assert.deepEqual(answerLines(wedding, answers, "Alex"), [
    { label: "Meal choice", value: "Alex: Fish, Sam: Chicken" },
    { label: "Who's coming with you?", value: "Sam" },
    { label: "Allergies or dietary needs", value: "No nuts" },
  ]);
  assert.deepEqual(storedAnswers({ meal: ["Fish", 3], diet: "x", junk: { a: 1 } }), { meal: ["Fish"], diet: "x" });
});

test("meal counts add up everyone going, and count RSVPs with no answer", () => {
  const [counts] = mealCounts(wedding, [
    { rsvp_status: "yes", answers: { meal: ["Fish", "Chicken"] } },
    { rsvp_status: "yes", answers: { meal: ["Fish"] } },
    { rsvp_status: "yes", answers: {} },
    { rsvp_status: "maybe", answers: { meal: ["Vegetarian"] } },
  ]);
  assert.deepEqual(counts.counts, [
    { option: "Chicken", count: 1 },
    { option: "Fish", count: 2 },
    { option: "Vegetarian", count: 0 },
  ]);
  assert.equal(counts.unanswered, 1);
});

test("messages and change emails go to the right guests", () => {
  const guests = [
    { name: "Yes", email: "y@example.com", rsvp_status: "yes", invited_at: null },
    { name: "Maybe", email: "m@example.com", rsvp_status: "maybe", invited_at: null },
    { name: "Invited", email: "i@example.com", rsvp_status: "pending", invited_at: "2026-11-01T00:00:00Z" },
    { name: "Not sent", email: "n@example.com", rsvp_status: "pending", invited_at: null },
    { name: "No", email: "no@example.com", rsvp_status: "no", invited_at: "2026-11-01T00:00:00Z" },
    { name: "No email", email: null, rsvp_status: "yes", invited_at: null },
  ];
  assert.deepEqual(messageRecipients(guests, "going").map((g) => g.name), ["Yes"]);
  assert.deepEqual(messageRecipients(guests, "going_maybe").map((g) => g.name), ["Yes", "Maybe"]);
  assert.deepEqual(messageRecipients(guests, "not_declined").map((g) => g.name), ["Yes", "Maybe", "Invited", "Not sent"]);
  assert.deepEqual(changeRecipients(guests).map((g) => g.name), ["Yes", "Maybe", "Invited"]);
});

test("only a real change to the date, time or place counts", () => {
  const before = {
    event_date: "2026-11-21",
    start_time: "16:00:00",
    end_time: null,
    time_zone: "America/Los_Angeles",
    location_name: "Linda's",
    location_address: "12 Elm St",
  };
  assert.deepEqual(changedParts(before, { ...before, start_time: "16:00", location_name: " Linda's " }), []);
  assert.deepEqual(changedParts(before, { ...before, start_time: "17:00" }), ["time"]);
  assert.deepEqual(changedParts(before, { ...before, event_date: "2026-11-22", location_address: "14 Elm St" }), ["date", "place"]);
  assert.equal(changeSummary(["date", "time", "place"]), "New date, time and place");
  assert.equal(changeSummary(["place"]), "New place");
});

test("tomorrow is worked out in the event's own time zone", () => {
  // 15:00 UTC on Nov 20 is 7 AM on Nov 20 in Los Angeles and midnight on Nov 21 in Tokyo.
  const now = new Date("2026-11-20T15:00:00Z");
  assert.equal(dateIn("America/Los_Angeles", now), "2026-11-20");
  assert.equal(dateIn("Asia/Tokyo", now), "2026-11-21");
  assert.equal(isTomorrowFor({ event_date: "2026-11-21", time_zone: "America/Los_Angeles" }, now), true);
  assert.equal(isTomorrowFor({ event_date: "2026-11-21", time_zone: "Asia/Tokyo" }, now), false);
  assert.equal(isTomorrowFor({ event_date: "2026-11-22", time_zone: "Asia/Tokyo" }, now), true);
  assert.equal(isTomorrowFor({ event_date: null, time_zone: null }, now), false);
});
