// Run with: node --test src/lib/gifts.test.ts
// Node runs TypeScript directly since version 23.6.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fundAsUnpledged,
  hidesReservations,
  itemAsUnreserved,
  readReservationPrivacy,
  reservationsHiddenFrom,
  settingsAfterJoiningExchange,
} from "./gifts.ts";

const OWNER = "owner-id";
const MANAGER = "manager-id";

test("reservations show by default", () => {
  assert.equal(hidesReservations({}), false);
  assert.equal(hidesReservations(null), false);
  assert.equal(reservationsHiddenFrom({ owner_id: OWNER, settings: {} }, OWNER), false);
});

test("hiding applies to the owner only", () => {
  const registry = { owner_id: OWNER, settings: { hide_reservations: true } };
  assert.equal(reservationsHiddenFrom(registry, OWNER), true);
  assert.equal(reservationsHiddenFrom(registry, MANAGER), false);
  assert.equal(reservationsHiddenFrom(registry, null), false);
  assert.equal(reservationsHiddenFrom(registry, undefined), false);
});

test("a list kept for a child always shows reservations", () => {
  const registry = { owner_id: OWNER, settings: { hide_reservations: true, for_child: true } };
  assert.equal(hidesReservations(registry.settings), false);
  assert.equal(reservationsHiddenFrom(registry, OWNER), false);
});

test("reads only the values it knows", () => {
  assert.deepEqual(readReservationPrivacy({ hide_reservations: "yes", hide_reservations_source: "guest", for_child: 1 }), {
    hide_reservations: undefined,
    hide_reservations_source: undefined,
    for_child: false,
  });
  assert.deepEqual(readReservationPrivacy({ hide_reservations: false, hide_reservations_source: "owner" }), {
    hide_reservations: false,
    hide_reservations_source: "owner",
    for_child: false,
  });
});

test("an item shows nothing reserved, unless the owner bought it", () => {
  assert.equal(itemAsUnreserved({ quantity_fulfilled: 2, is_parent_purchased: false }).quantity_fulfilled, 0);
  assert.equal(itemAsUnreserved({ quantity_fulfilled: 3, is_parent_purchased: true }).quantity_fulfilled, 3);
  assert.equal(fundAsUnpledged({ current_amount: 75, title: "Trip" }).current_amount, 0);
});

test("joining a gift exchange turns hiding on for a personal wishlist", () => {
  assert.deepEqual(settingsAfterJoiningExchange({ registry_type: "personal", settings: { zip_code: "94110" } }), {
    zip_code: "94110",
    hide_reservations: true,
    hide_reservations_source: "exchange",
  });
});

test("joining a gift exchange leaves other lists alone", () => {
  // A baby registry: its owners need to see gifts for thank-you notes.
  assert.equal(settingsAfterJoiningExchange({ registry_type: "baby", settings: {} }), null);
  // The owner already chose, either way.
  assert.equal(settingsAfterJoiningExchange({ registry_type: "personal", settings: { hide_reservations: false } }), null);
  assert.equal(settingsAfterJoiningExchange({ registry_type: "personal", settings: { hide_reservations: true } }), null);
  // A list kept for a child.
  assert.equal(settingsAfterJoiningExchange({ registry_type: "personal", settings: { for_child: true } }), null);
});
