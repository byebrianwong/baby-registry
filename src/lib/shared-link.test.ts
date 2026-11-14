// Run with: node --test src/lib/shared-link.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import { nameFromProductUrl } from "./shared-link.ts";

test("takes the name from the words in a product link", () => {
  assert.equal(
    nameFromProductUrl("https://www.amazon.com/Graco-4Ever-DLX-Car-Seat/dp/B07PMK8R2V"),
    "Graco 4Ever DLX Car Seat",
  );
  assert.equal(
    nameFromProductUrl("https://www.target.com/p/hatch-rest-sound-machine/-/A-81450283"),
    "Hatch rest sound machine",
  );
});

test("ignores Amazon's tracking part when the link has no name", () => {
  assert.equal(
    nameFromProductUrl("https://www.amazon.com/gp/product/B0EXAMPLE1/ref=ox_sc_saved_title_3?smid=ATVPDKIKX0DER&th=1"),
    undefined,
  );
});

test("still finds the name beside Amazon's tracking part", () => {
  assert.equal(
    nameFromProductUrl("https://www.amazon.com/Graco-4Ever-DLX-Car-Seat/dp/B07PMK8R2V/ref=sr_1_3_sspa"),
    "Graco 4Ever DLX Car Seat",
  );
});

test("returns nothing for short links", () => {
  assert.equal(nameFromProductUrl("https://a.co/d/abc123"), undefined);
});
