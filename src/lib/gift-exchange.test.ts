// Run with: node --test src/lib/gift-exchange.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import { drawNames, type Pair } from "./gift-exchange.ts";

function check(people: string[], exclusions: Pair[], matches: Map<string, string>) {
  assert.equal(matches.size, people.length, "everyone gives");
  assert.deepEqual([...matches.values()].sort(), [...people].sort(), "everyone receives once");
  for (const [giver, receiver] of matches) {
    assert.notEqual(giver, receiver, "nobody draws themselves");
    for (const [a, b] of exclusions) {
      assert.ok(!(giver === a && receiver === b) && !(giver === b && receiver === a), `${giver} drew excluded ${receiver}`);
    }
  }
}

test("needs at least three people", () => {
  assert.deepEqual(drawNames({ people: ["a", "b"], exclusions: [] }), { ok: false, reason: "too_few" });
});

test("everyone gives once and receives once", () => {
  const people = Array.from({ length: 12 }, (_, i) => `p${i}`);
  for (let run = 0; run < 200; run++) {
    const result = drawNames({ people, exclusions: [] });
    assert.ok(result.ok);
    if (result.ok) check(people, [], result.matches);
  }
});

test("couples never draw each other", () => {
  const people = ["ann", "bob", "cat", "dan", "eve", "fay"];
  const exclusions: Pair[] = [["ann", "bob"], ["cat", "dan"], ["eve", "fay"]];
  for (let run = 0; run < 300; run++) {
    const result = drawNames({ people, exclusions });
    assert.ok(result.ok);
    if (result.ok) check(people, exclusions, result.matches);
  }
});

test("avoids two people drawing each other when there are more than two", () => {
  const people = ["a", "b", "c", "d", "e"];
  for (let run = 0; run < 200; run++) {
    const result = drawNames({ people, exclusions: [] });
    assert.ok(result.ok);
    if (!result.ok) continue;
    for (const [giver, receiver] of result.matches) {
      assert.notEqual(result.matches.get(receiver), giver);
    }
  }
});

test("avoids last time's pairs when it can", () => {
  const people = ["a", "b", "c", "d", "e", "f"];
  const previous: Pair[] = [["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["e", "f"], ["f", "a"]];
  for (let run = 0; run < 200; run++) {
    const result = drawNames({ people, exclusions: [], previous });
    assert.ok(result.ok);
    if (!result.ok) continue;
    for (const [giver, receiver] of previous) assert.notEqual(result.matches.get(giver), receiver);
  }
});

test("repeats a past pair rather than fail", () => {
  // With three people and no mutual pairs there are only two ways to draw.
  // Last time used one; ruling out the other's pairs too leaves no way at all
  // without a repeat.
  const people = ["a", "b", "c"];
  const previous: Pair[] = [["a", "b"], ["b", "c"], ["c", "a"], ["a", "c"]];
  const result = drawNames({ people, exclusions: [], previous });
  assert.ok(result.ok);
  if (result.ok) check(people, [], result.matches);
});

test("reports when exclusions make a draw impossible", () => {
  // c can't give to anyone.
  const result = drawNames({ people: ["a", "b", "c"], exclusions: [["a", "c"], ["b", "c"]] });
  assert.deepEqual(result, { ok: false, reason: "impossible" });
});

test("handles a large exchange quickly", () => {
  const people = Array.from({ length: 300 }, (_, i) => `p${i}`);
  const exclusions: Pair[] = [];
  for (let i = 0; i < 300; i += 2) exclusions.push([`p${i}`, `p${i + 1}`]);
  const started = Date.now();
  const result = drawNames({ people, exclusions });
  assert.ok(result.ok);
  if (result.ok) check(people, exclusions, result.matches);
  assert.ok(Date.now() - started < 2000, "under two seconds");
});
