// Run with: node --test src/lib/groups.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import { memberCountLabel, newPeople, personKey, readGroupName } from "./groups.ts";

test("the same email is the same person, whatever the name or case", () => {
  assert.equal(personKey({ name: "Ann", email: "Ann@Example.com " }), personKey({ name: "Annie", email: "ann@example.com" }));
  assert.notEqual(personKey({ name: "Ann", email: null }), personKey({ name: "Ann", email: "ann@example.com" }));
  assert.equal(personKey({ name: " Grandma ", email: null }), personKey({ name: "grandma", email: null }));
});

test("only people not on the list yet are added, once each", () => {
  const existing = [
    { name: "Ann", email: "ann@example.com" },
    { name: "Grandma", email: null },
  ];
  const incoming = [
    { name: "Ann Lee", email: "ANN@example.com" },
    { name: "grandma", email: null },
    { name: " Ben ", email: " Ben@Example.com" },
    { name: "Ben again", email: "ben@example.com" },
    { name: "   ", email: null },
    { name: "Cy", email: null },
  ];
  assert.deepEqual(newPeople(existing, incoming), [
    { name: "Ben", email: "ben@example.com" },
    { name: "Cy", email: null },
  ]);
});

test("group names are trimmed and must fit", () => {
  assert.deepEqual(readGroupName("  The   Chens "), { name: "The Chens" });
  assert.deepEqual(readGroupName(""), { error: "Give the group a name." });
  assert.ok("error" in readGroupName("x".repeat(81)));
});

test("member counts read naturally", () => {
  assert.equal(memberCountLabel(1), "1 person");
  assert.equal(memberCountLabel(4), "4 people");
});
