// Run with: node --test src/lib/occasions.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import {
  LIST_OCCASIONS,
  OCCASIONS,
  OCCASION_IDS,
  giftPlansFor,
  listTint,
  listTitleFor,
  occasionFor,
  planNeedsEvent,
} from "./occasions.ts";

const MIGRATIONS = new URL("../../supabase/migrations/", import.meta.url);

/** The values in the newest check constraint with this name, from the migration files. */
function constraintValues(name: string): string[] {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  let values: string[] = [];
  for (const file of files) {
    const sql = readFileSync(new URL(file, MIGRATIONS), "utf8");
    const at = sql.lastIndexOf(name);
    if (at === -1) continue;
    const list = sql.slice(at).match(/in\s*\(([^)]*)\)/);
    if (list) values = [...list[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  }
  return values;
}

test("every occasion is an event type the database allows, and the other way round", () => {
  assert.deepEqual([...OCCASION_IDS].sort(), constraintValues("events_event_type_check").sort());
});

test("every list occasion is a registry event type the database allows", () => {
  // 009_registry_types.sql lists them inline on registries.event_type.
  const sql = readFileSync(new URL("009_registry_types.sql", MIGRATIONS), "utf8");
  const values = [...sql.slice(sql.indexOf("add column event_type")).matchAll(/'([a-z_]+)'/g)]
    .map((m) => m[1])
    .filter((v) => v !== "baby" && v !== "personal");
  assert.deepEqual([...LIST_OCCASIONS].sort(), [...new Set(values)].sort());
});

test("each occasion's list is a kind of list a registry can store", () => {
  for (const occasion of OCCASIONS) {
    if (occasion.list.registryType === "baby") assert.equal(occasion.list.eventType, null, occasion.id);
    else assert.ok((LIST_OCCASIONS as readonly string[]).includes(occasion.list.eventType ?? ""), occasion.id);
    assert.ok(occasion.audiences.length > 0, occasion.id);
  }
});

test("colors match what registries and events showed before the lists merged", () => {
  assert.equal(occasionFor("baby_shower").tint, "blush");
  assert.equal(occasionFor("kids_birthday").tint, "sunshine");
  assert.equal(occasionFor("holiday").tint, "mint");
  assert.equal(occasionFor("wedding").tint, "teal");
  assert.equal(listTint("baby", null), "blush");
  assert.equal(listTint("personal", "birthday"), "sunshine");
  assert.equal(listTint("personal", "christmas"), "mint");
  assert.equal(listTint("personal", "graduation"), "teal");
});

test("titles read naturally, with or without a name", () => {
  assert.equal(occasionFor("baby_shower").titleFor("Remi"), "Remi's Baby Shower");
  assert.equal(occasionFor("birthday").titleFor("James"), "James' Birthday");
  assert.equal(occasionFor("birthday").titleFor(""), "Birthday");
  assert.equal(listTitleFor(occasionFor("baby_shower"), "Remi & Max"), "Remi & Max's Baby Registry");
  assert.equal(listTitleFor(occasionFor("kids_birthday"), "Jordan"), "Jordan's Birthday Wishlist");
});

test("gift plans fit who it's for", () => {
  assert.deepEqual(giftPlansFor("someone"), ["link", "ask", "no_gifts", "later"]);
  assert.ok(giftPlansFor("child").includes("new_list"));
  assert.deepEqual(giftPlansFor("everyone"), ["everyone", "exchange"]);
  assert.equal(planNeedsEvent("new_list"), false);
  assert.equal(planNeedsEvent("ask"), true);
});
