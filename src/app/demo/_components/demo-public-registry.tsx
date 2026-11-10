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
import { copyForRegistry } from "@/lib/registry-copy";
import { parseRetailerRegistries } from "@/lib/retailers";
import { useDemoToday } from "../demo-today";
import { DemoGuestShell } from "./demo-shell";
import { DemoGuestHeader } from "./demo-guest-header";

type MyGifts = { items?: Record<string, string>; funds?: Record<string, number> };

/** A demo registry's share page, as a guest sees it. Like src/app/r/[slug]/page.tsx. */
export function DemoPublicRegistry({ slug }: { slug: string }) {
  const today = useDemoToday();
  const registry = findDemoRegistry(today, { slug });
  if (!registry) notFound();
  const [items, setItems] = useState(registry.items);
  const [funds, setFunds] = useState(registry.cashFunds);
  const [coverCounts, setCoverCounts] = useState<Record<string, number>>({});
  // What this visitor gave, so the page marks it like the real one does.
  const [myGifts, setMyGifts] = useState<MyGifts>({});

  const isBaby = registry.registry_type === "baby";
  const copy = copyForRegistry(registry);
  const parentName = registry.honoree_names;
  const shippingAddress = registry.settings.shipping_address;

  const markItem = (itemId: string) =>
    setMyGifts((gifts) => ({ ...gifts, items: { ...gifts.items, [itemId]: "demo" } }));

  // Like the real actions in src/lib/actions/registry.ts, minus the saving.
  const actions: GiftActions = {
    reserve: async (formData) => {
      const itemId = String(formData.get("itemId"));
      const quantity = Number(formData.get("quantity")) || 1;
      setItems((current) =>
        current.map((i) => (i.id === itemId ? { ...i, quantity_fulfilled: i.quantity_fulfilled + quantity } : i)),
      );
      markItem(itemId);
      // A guest sees the address once they've reserved something.
      return { shippingAddress };
    },
    cover: async (formData) => {
      const itemId = String(formData.get("itemId"));
      const quantity = Number(formData.get("quantity")) || 1;
      setCoverCounts((counts) => ({ ...counts, [itemId]: (counts[itemId] || 0) + quantity }));
      markItem(itemId);
      return undefined;
    },
    contribute: async (formData) => {
      const fundId = String(formData.get("fundId"));
      const amount = Number(formData.get("amount")) || 0;
      setFunds((current) =>
        current.map((f) => (f.id === fundId ? { ...f, current_amount: f.current_amount + amount } : f)),
      );
      setMyGifts((gifts) => ({ ...gifts, funds: { ...gifts.funds, [fundId]: (gifts.funds?.[fundId] || 0) + amount } }));
      return undefined;
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
          shippingAddress={Object.keys(myGifts.items ?? {}).length > 0 ? shippingAddress : undefined}
          myGifts={myGifts}
          coverCounts={coverCounts}
          selfPurchasedLabel={copy.selfPurchasedLabel}
          coverFlavor={copy.coverItemFlavor(parentName)}
          linkedStores={isBaby ? parseRetailerRegistries(registry.settings).map((r) => r.store) : []}
          showStoreRegistries={isBaby}
          actions={actions}
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
