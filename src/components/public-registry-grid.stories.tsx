import type { Meta, StoryObj } from "@storybook/react";
import { PublicRegistryGrid } from "./public-registry-grid";

const base = {
  image_url: null,
  quantity_needed: 1,
  quantity_fulfilled: 0,
  is_essential: false,
  is_parent_purchased: false,
  is_open_to_used: false,
  minimum_condition: null,
  notes: null,
  category_id: "nursery",
};

const meta: Meta<typeof PublicRegistryGrid> = {
  title: "Components/PublicRegistryGrid",
  component: PublicRegistryGrid,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof PublicRegistryGrid>;

// Items from several stores, using each store's real link shapes with
// made-up ids. The Amazon, Target and Walmart links are registry links, so
// their gift dialogs explain how to buy there, whether or not the owner has
// linked that store in settings (only Amazon and Target are linked here). The
// Etsy item's dialog stays as before. The store filter appears because items
// come from more than one store.
export const ItemsFromStores: Story = {
  args: {
    parentName: "Remi & Max",
    categories: [{ id: "nursery", name: "Nursery", sort_order: 0 }],
    cashFunds: [],
    myGifts: {},
    coverCounts: {},
    suggestButton: null,
    linkedStores: ["amazon", "target"],
    showStoreRegistries: true,
    items: [
      {
        ...base,
        id: "1",
        title: "Solly Baby Wrap, Newborn to Toddler Baby Carrier",
        price: 74,
        is_essential: true,
        external_url: "https://www.amazon.com/dp/B0EXAMPLE?colid=EXAMPLE&coliid=EXAMPLE&psc=1",
      },
      {
        ...base,
        id: "2",
        title: "Hatch Rest+ Sound Machine",
        price: 69.99,
        external_url:
          "https://www.target.com/p/hatch-rest-sound-machine/-/A-00000000?registryId=EXAMPLE&itemLineNum=1",
      },
      {
        ...base,
        id: "3",
        title: "Angelcare Baby Bath Support",
        price: 24.97,
        external_url: "https://www.walmart.com/ip/seort/000000?listRegistryId=EXAMPLE&listRegistryType=BR",
      },
      {
        ...base,
        id: "4",
        title: "Hand-knit Baby Blanket",
        price: 58,
        external_url: "https://www.etsy.com/listing/000000/hand-knit-baby-blanket",
      },
    ],
  },
};

// What a guest sees on each kind of item. The bassinet is reserved by this
// guest, the blanket was given by them, the monitor is reserved by another
// guest, the swing was given by another guest, and the bath is still open.
export const GiftStates: Story = {
  args: {
    parentName: "Remi & Max",
    categories: [{ id: "nursery", name: "Nursery", sort_order: 0 }],
    cashFunds: [],
    myGifts: {},
    coverCounts: {},
    suggestButton: null,
    shippingAddress: "123 Main St\nApt 4B\nSan Francisco, CA 94102",
    myItemGifts: {
      "1": { purchaseId: "p1", status: "reserved", reservedUntil: "2026-11-15T12:00:00Z", quantity: 1 },
      "2": { purchaseId: "p2", status: "purchased", reservedUntil: null, quantity: 1 },
    },
    reservedCounts: { "1": 1, "3": 1 },
    items: [
      {
        ...base,
        id: "1",
        title: "Halo BassiNest Swivel Sleeper",
        price: 249.99,
        quantity_fulfilled: 1,
        external_url: "https://www.amazon.com/dp/B0EXAMPLE1",
      },
      {
        ...base,
        id: "2",
        title: "Hand-knit Baby Blanket",
        price: 58,
        quantity_fulfilled: 1,
        external_url: "https://www.etsy.com/listing/000000/hand-knit-baby-blanket",
      },
      {
        ...base,
        id: "3",
        title: "Nanit Pro Smart Baby Monitor",
        price: 299,
        quantity_fulfilled: 1,
        external_url: "https://www.target.com/p/nanit-pro/-/A-00000001",
      },
      {
        ...base,
        id: "4",
        title: "4moms MamaRoo Baby Swing",
        price: 219.99,
        quantity_fulfilled: 1,
        external_url: null,
      },
      {
        ...base,
        id: "5",
        title: "Angelcare Baby Bath Support",
        price: 24.97,
        is_essential: true,
        external_url: "https://www.walmart.com/ip/seort/000000",
      },
    ],
  },
};
