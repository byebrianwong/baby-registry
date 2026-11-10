import type { Meta, StoryObj } from "@storybook/react";
import { PublicRegistryGrid } from "./public-registry-grid";
import { SuggestItemDialog } from "./suggest-item-dialog";

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

// The stories never send a suggestion.
const suggestButton = (categories: { id: string; name: string }[]) => (
  <SuggestItemDialog registryId="registry-1" categories={categories} action={async () => undefined} />
);

// Items from several stores, using each store's real link shapes with
// made-up ids. The Amazon, Target and Walmart links are registry links, so
// their gift dialogs explain how to buy there, whether or not the owner has
// linked that store in settings (only Amazon and Target are linked here). The
// Etsy item's dialog stays as before. The store filter appears because items
// come from more than one store. On wide screens, "Suggest an item" sits in
// the category sidebar.
export const ItemsFromStores: Story = {
  args: {
    parentName: "Remi & Max",
    categories: [{ id: "nursery", name: "Nursery", sort_order: 0 }],
    cashFunds: [],
    myGifts: {},
    coverCounts: {},
    suggestButton: suggestButton([{ id: "nursery", name: "Nursery" }]),
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

// What a guest sees after opening a texted link: a 16px search box, so iOS
// doesn't zoom in, and 44px filters and buttons. The categories hide behind
// the floating list button, so "Suggest an item" moves up under the filters.
export const Phone: Story = {
  ...ItemsFromStores,
  globals: { viewport: { value: "mobile1" } },
};

// A registry with no categories, items or funds yet. Guests can still
// suggest something.
export const NoItemsYet: Story = {
  args: {
    ...ItemsFromStores.args,
    categories: [],
    items: [],
    suggestButton: suggestButton([]),
  },
};
