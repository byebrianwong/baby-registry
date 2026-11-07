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

// Items from several stores. The owner linked their Amazon and Target
// registries, so those items' gift dialogs explain how to buy there. The
// store filter appears because items come from more than one store.
export const ItemsFromStores: Story = {
  args: {
    parentName: "Sarah & Mike",
    categories: [{ id: "nursery", name: "Nursery", sort_order: 0 }],
    cashFunds: [],
    myGifts: {},
    coverCounts: {},
    suggestButton: null,
    linkedStores: ["amazon", "target"],
    items: [
      {
        ...base,
        id: "1",
        title: "Solly Baby Wrap, Newborn to Toddler Baby Carrier",
        price: 74,
        is_essential: true,
        external_url: "https://www.amazon.com/dp/B0EXAMPLE?colid=EXAMPLE&coliid=EXAMPLE",
      },
      {
        ...base,
        id: "2",
        title: "Hatch Rest+ Sound Machine",
        price: 69.99,
        external_url: "https://www.target.com/p/hatch-rest-sound-machine/-/A-00000000?registryId=EXAMPLE",
      },
      {
        ...base,
        id: "3",
        title: "Angelcare Baby Bath Support",
        price: 24.97,
        external_url: "https://www.walmart.com/ip/angelcare-baby-bath-support/000000",
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
