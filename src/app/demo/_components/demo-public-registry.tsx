"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow-button";
import { PublicRegistryGrid, type GiftActions } from "@/components/public-registry-grid";
import { PublicRegistryHero } from "@/components/public-registry-hero";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SuggestItemDialog } from "@/components/suggest-item-dialog";
import { DEMO_ME, demoFollowState, demoOk, demoProfilePath } from "@/lib/demo-people";
import { findDemoRegistry } from "@/lib/demo-registries";
import { GIFT_HOLD_DAYS, type MyItemGift } from "@/lib/gifts";
import { PAYBACK_NOTE_MAX, parseGroupGiftAmount } from "@/lib/group-gifts";
import { copyForRegistry } from "@/lib/registry-copy";
import { parseRetailerRegistries } from "@/lib/retailers";
import { useDemoToday } from "../demo-today";
import { DemoGuestShell } from "./demo-shell";
import { DemoGuestHeader } from "./demo-guest-header";
import { rememberStartedGroupGift, startedGroupGiftToken } from "./demo-started-group-gifts";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A demo registry's share page, as a guest sees it. Like src/app/r/[slug]/page.tsx. */
export function DemoPublicRegistry({ slug }: { slug: string }) {
  const today = useDemoToday();
  const registry = findDemoRegistry(today, { slug });
  if (!registry) notFound();
  const [items, setItems] = useState(registry.items);
  const [funds, setFunds] = useState(registry.cashFunds);
  const [coverCounts, setCoverCounts] = useState<Record<string, number>>({});
  // What this visitor gave, so the page marks it like the real one does: their
  // gift on each item, by item id, and what they sent each cash fund.
  const [myItemGifts, setMyItemGifts] = useState<Record<string, MyItemGift>>({});
  const [myFunds, setMyFunds] = useState<Record<string, number>>({});

  const isBaby = registry.registry_type === "baby";
  const copy = copyForRegistry(registry);
  const parentName = registry.honoree_names;
  const shippingAddress = registry.settings.shipping_address;

  const addToFulfilled = (itemId: string, change: number) =>
    setItems((current) =>
      current.map((i) =>
        i.id === itemId ? { ...i, quantity_fulfilled: Math.max(0, i.quantity_fulfilled + change) } : i
      )
    );
  const forgetGift = (itemId: string) =>
    setMyItemGifts((gifts) => {
      const next = { ...gifts };
      delete next[itemId];
      return next;
    });

  // Like the real actions in src/lib/actions/registry.ts, minus the saving.
  const actions: GiftActions = {
    reserve: (itemId) => ({
      reserve: async (formData) => {
        const quantity = Number(formData.get("quantity")) || 1;
        const bought = formData.get("alreadyBought") === "1";
        const gift: MyItemGift = {
          purchaseId: `demo-${itemId}`,
          status: bought ? "purchased" : "reserved",
          reservedUntil: bought ? null : new Date(Date.now() + GIFT_HOLD_DAYS * DAY_MS).toISOString(),
          quantity,
        };
        addToFulfilled(itemId, quantity);
        setMyItemGifts((gifts) => ({ ...gifts, [itemId]: gift }));
        // A guest sees the address once they've reserved something.
        return {
          success: true,
          purchaseId: gift.purchaseId,
          status: gift.status,
          reservedUntil: gift.reservedUntil,
          shippingAddress,
        };
      },
      confirm: async () => {
        setMyItemGifts((gifts) => ({
          ...gifts,
          [itemId]: { ...gifts[itemId], status: "purchased", reservedUntil: null },
        }));
        return {};
      },
      release: async () => {
        const gift = myItemGifts[itemId];
        if (gift) addToFulfilled(itemId, -gift.quantity);
        forgetGift(itemId);
        return {};
      },
    }),
    cover: (itemId) => ({
      give: async (formData) => {
        const quantity = Number(formData.get("quantity")) || 1;
        const purchaseId = `demo-cover-${itemId}`;
        setCoverCounts((counts) => ({ ...counts, [itemId]: (counts[itemId] || 0) + quantity }));
        setMyItemGifts((gifts) => ({
          ...gifts,
          [itemId]: { purchaseId, status: "purchased", reservedUntil: null, quantity },
        }));
        return { success: true, purchaseId };
      },
      release: async () => {
        const gift = myItemGifts[itemId];
        if (gift) {
          setCoverCounts((counts) => ({ ...counts, [itemId]: Math.max(0, (counts[itemId] || 0) - gift.quantity) }));
        }
        forgetGift(itemId);
        return {};
      },
    }),
    contribute: async (formData) => {
      const fundId = String(formData.get("fundId"));
      const amount = Number(formData.get("amount")) || 0;
      setFunds((current) =>
        current.map((f) => (f.id === fundId ? { ...f, current_amount: f.current_amount + amount } : f)),
      );
      setMyFunds((given) => ({ ...given, [fundId]: (given[fundId] || 0) + amount }));
      return undefined;
    },
    // Like startGroupGift, which reserves the item and opens the group gift's
    // page. The demo's page shows the total and note typed in here.
    startGroupGift: async (input) => {
      const goalText = input.goalAmount == null ? "" : String(input.goalAmount).trim();
      const goalAmount = goalText ? parseGroupGiftAmount(goalText) : null;
      if (goalText && goalAmount === null) return { error: "Enter the total to collect, like 120." };
      const token = startedGroupGiftToken(registry.id, input.itemId);
      rememberStartedGroupGift(token, {
        goalAmount,
        paybackNote: (input.paybackNote ?? "").trim().slice(0, PAYBACK_NOTE_MAX) || null,
      });
      return { success: true, token };
    },
  };

  // On Remi & Max's own registries you're a guest, who can ask to follow
  // them. On friends' registries, you're Remi & Max, who may already follow.
  const ownedByDemoAccount = registry.owner.public_id === DEMO_ME.public_id;
  const followState = ownedByDemoAccount ? "none" : demoFollowState(registry.owner.public_id);

  return (
    <DemoGuestShell>
      <DemoGuestHeader />
      <PublicRegistryHero
        isBabyRegistry={isBaby}
        title={registry.title}
        names={registry.honoree_names}
        eventDate={registry.event_date}
        description={registry.description}
        fulfilledItems={items.filter((i) => i.quantity_fulfilled >= i.quantity_needed).length}
        totalItems={items.length}
        owner={
          registry.listed_on_profile
            ? { name: registry.owner.full_name, path: demoProfilePath(registry.owner) }
            : null
        }
        followButton={
          followState !== "self" && (
            <FollowButton
              publicId={registry.owner.public_id}
              name={registry.owner.full_name}
              state={followState}
              returnTo={`/demo/r/${registry.slug}`}
              requestAction={demoOk}
              cancelAction={demoOk}
              basePath="/demo"
            />
          )
        }
      />

      <main className="container mx-auto px-4 py-8">
        <PublicRegistryGrid
          items={items}
          categories={registry.categories}
          cashFunds={funds}
          parentName={parentName}
          paymentMethods={registry.settings.payment_methods}
          // The real page sends the address only once this visitor reserved
          // something. The reserve dialog gets it back from the action here.
          shippingAddress={Object.keys(myItemGifts).length > 0 ? shippingAddress : undefined}
          myGifts={{ funds: myFunds }}
          myItemGifts={myItemGifts}
          coverCounts={coverCounts}
          selfPurchasedLabel={copy.selfPurchasedLabel}
          coverFlavor={copy.coverItemFlavor(parentName)}
          linkedStores={isBaby ? parseRetailerRegistries(registry.settings).map((r) => r.store) : []}
          showStoreRegistries={isBaby}
          actions={actions}
          demo
          // Anyone can start a group gift here. The demo counts you as signed
          // in, so the dialog shows its form rather than asking you to sign in.
          groupGifts={{
            registryId: registry.id,
            signedIn: true,
            returnTo: `/demo/r/${registry.slug}`,
            mine: {},
            basePath: "/demo",
          }}
          suggestButton={
            <SuggestItemDialog
              registryId={registry.id}
              categories={registry.categories.map((c) => ({ id: c.id, name: c.name }))}
              action={async () => undefined}
            />
          }
        />
      </main>

      <ScrollToTop />
    </DemoGuestShell>
  );
}
