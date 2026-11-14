// The demo's group gifts (src/lib/group-gifts.ts). One so far: shower guests
// going in on the stroller on Remi & Max's baby registry, which Oz started
// from the shower's invitation. Nothing here is saved anywhere.
//
// Oz organizes it rather than Glinda, who hosts the shower, because Glinda
// helps manage the baby registry. The real site doesn't let a list's managers
// start a group gift on it or see its pledges, so the surprise holds.
//
// Registries and events are passed in rather than imported, because
// src/lib/demo-registries.ts imports this file for the stroller's reservation.

import type { DemoPurchase, DemoRegistry } from "@/lib/demo-registries";
import { addDays } from "@/lib/demo-data";
import { DEMO_OZ, type DemoPerson } from "@/lib/demo-people";
import {
  groupGiftReservationName,
  type EventGroupGift,
  type GroupGiftView,
  type GroupGiftViewer,
} from "@/lib/group-gifts";
import { honoreeDisplayName } from "@/lib/registry-copy";

export interface DemoPledge {
  id: string;
  name: string;
  email: string;
  amount: number;
  /** The organizer ticked them off as paid back. */
  paid: boolean;
}

export interface DemoGroupGift {
  token: string;
  registryId: string;
  itemId: string;
  /** The event it was started from. Its guests see it on their invitation. */
  eventId: string | null;
  organizer: DemoPerson;
  goalAmount: number | null;
  paybackNote: string | null;
  /** Everyone chipping in, the organizer's own share first. */
  pledges: DemoPledge[];
  /** When the organizer started it and reserved the item. */
  startedDaysAgo: number;
}

/** The stroller's group gift. The demo guide links to its page. */
export const DEMO_STROLLER_GROUP_GIFT_TOKEN = "uppababy-stroller-group-gift";

export const DEMO_GROUP_GIFTS: DemoGroupGift[] = [
  {
    token: DEMO_STROLLER_GROUP_GIFT_TOKEN,
    registryId: "baby",
    itemId: "item-17",
    eventId: "baby-shower",
    organizer: DEMO_OZ,
    goalAmount: 979.99,
    paybackNote: "Venmo @oz-diggs",
    pledges: [
      { id: "gg-p1", name: "Oz Diggs", email: DEMO_OZ.email, amount: 200, paid: false },
      { id: "gg-p2", name: "Dorothy Gale", email: "dorothy@example.com", amount: 250, paid: true },
      { id: "gg-p3", name: "Priya Shah", email: "priya@example.com", amount: 150, paid: true },
      { id: "gg-p4", name: "Taylor Brooks", email: "taylor@example.com", amount: 100, paid: false },
      { id: "gg-p5", name: "Elphaba Thropp", email: "elphie@example.com", amount: 75, paid: false },
    ],
    startedDaysAgo: 5,
  },
];

export function findDemoGroupGift(token: string): DemoGroupGift | null {
  return DEMO_GROUP_GIFTS.find((g) => g.token === token) ?? null;
}

function pledgedTotal(gift: Pick<DemoGroupGift, "pledges">): number {
  return Math.round(gift.pledges.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
}

/**
 * The reservation a group gift holds on its item, in the organizer's name and
 * "others", as the list's owners see it. Like startGroupGift in
 * src/lib/actions/group-gifts.ts.
 */
export function demoGroupGiftReservation(today: string, gift: DemoGroupGift, itemTitle: string): DemoPurchase {
  return {
    id: `purchase-${gift.token}`,
    registry_item_id: gift.itemId,
    cash_fund_id: null,
    buyer_name: groupGiftReservationName(gift.organizer.full_name),
    buyer_email: gift.organizer.email,
    quantity: 1,
    amount: null,
    status: "reserved",
    message: null,
    created_at: `${addDays(today, -gift.startedDaysAgo)}T19:30:00Z`,
    item_title: itemTitle,
  };
}

/**
 * The group gift's page, as a guest who opened the link or as its organizer.
 * Like groupGiftViewFor in src/lib/group-gifts-server.ts: only the organizer
 * sees everyone's amounts and emails, and can tick people off as paid.
 */
export function demoGroupGiftPage(
  gift: DemoGroupGift,
  registry: DemoRegistry,
  event: { title: string; slug: string } | null,
  as: "visitor" | "organizer",
): { view: GroupGiftView; viewer: GroupGiftViewer } {
  const item = registry.items.find((i) => i.id === gift.itemId);
  const isOrganizer = as === "organizer";
  const own = isOrganizer ? gift.pledges.find((p) => p.email === gift.organizer.email) : undefined;
  return {
    view: {
      token: gift.token,
      status: "open",
      item: {
        title: item?.title ?? "A gift",
        imageUrl: item?.image_url ?? null,
        url: item?.external_url ?? null,
        price: item?.price ?? null,
        onList: Boolean(item),
      },
      recipientName: honoreeDisplayName({ honoree_names: registry.honoree_names, parent_names: null }, registry.title),
      listTitle: registry.title,
      listSlug: registry.slug,
      organizerName: gift.organizer.full_name,
      goalAmount: gift.goalAmount,
      paybackNote: gift.paybackNote,
      pledged: pledgedTotal(gift),
      pledges: gift.pledges.map((p) => ({
        id: isOrganizer ? p.id : null,
        name: p.name,
        amount: isOrganizer ? p.amount : null,
        email: isOrganizer ? p.email : null,
        paid: p.paid,
        isMine: p.id === own?.id,
      })),
      event,
    },
    viewer: isOrganizer
      ? {
          role: "organizer",
          signedIn: true,
          myPledge: own ? { token: `demo-pledge-${own.id}`, name: own.name, amount: own.amount, paid: own.paid } : null,
          prefill: { name: gift.organizer.full_name, email: gift.organizer.email },
        }
      : // Someone opening the link for the first time, without an account.
        { role: "visitor", signedIn: false, myPledge: null, prefill: null },
  };
}

/** The group gift as an event's guests see it on their invitation. Like groupGiftsForEvent. */
export function demoEventGroupGift(gift: DemoGroupGift, registry: DemoRegistry): EventGroupGift {
  const item = registry.items.find((i) => i.id === gift.itemId);
  return {
    token: gift.token,
    status: "open",
    itemTitle: item?.title ?? "A gift",
    imageUrl: item?.image_url ?? null,
    recipientName: honoreeDisplayName({ honoree_names: registry.honoree_names, parent_names: null }, registry.title),
    organizerName: gift.organizer.full_name,
    goalAmount: gift.goalAmount,
    pledged: pledgedTotal(gift),
    pledgeCount: gift.pledges.length,
  };
}
