import type { Meta, StoryObj } from "@storybook/react";
import { ItemCard } from "./item-card";

const meta: Meta<typeof ItemCard> = {
  title: "Components/ItemCard",
  component: ItemCard,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ItemCard>;

export const Default: Story = {
  args: {
    registryId: "demo",
    isOwner: true,
    item: {
      id: "1",
      title: "Babyletto Hudson 3-in-1 Convertible Crib",
      external_url: "https://www.babyletto.com",
      image_url: null,
      price: 399.0,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      is_essential: true,
      is_parent_purchased: false,
      notes: "We love the white finish!",
    },
  },
};

export const WithImage: Story = {
  args: {
    registryId: "demo",
    isOwner: true,
    item: {
      id: "2",
      title: "Babyletto Hudson 3-in-1 Convertible Crib",
      external_url: "https://www.babyletto.com",
      image_url:
        "https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=300&h=300&fit=crop",
      price: 399.0,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      is_essential: true,
      is_parent_purchased: false,
      notes: "We love the white finish!",
    },
  },
};

export const Fulfilled: Story = {
  args: {
    registryId: "demo",
    isOwner: true,
    item: {
      id: "3",
      title: "Newton Crib Mattress",
      external_url: null,
      image_url: null,
      price: 299.0,
      quantity_needed: 1,
      quantity_fulfilled: 1,
      is_essential: true,
      is_parent_purchased: false,
      notes: "Breathable design",
    },
  },
};

export const ParentPurchased: Story = {
  args: {
    registryId: "demo",
    isOwner: true,
    item: {
      id: "3b",
      title: "Hatch Rest+ Sound Machine",
      external_url: null,
      image_url: null,
      price: 69.99,
      quantity_needed: 1,
      quantity_fulfilled: 1,
      is_essential: true,
      is_parent_purchased: true,
      notes: null,
    },
  },
};

export const MultiQuantity: Story = {
  args: {
    registryId: "demo",
    isOwner: true,
    item: {
      id: "4",
      title: "Aden + Anais Muslin Swaddles (4-pack)",
      external_url: null,
      image_url: null,
      price: 39.99,
      quantity_needed: 4,
      quantity_fulfilled: 2,
      is_essential: true,
      is_parent_purchased: false,
      notes: "Neutral colors preferred",
    },
  },
};

export const NonEssential: Story = {
  args: {
    registryId: "demo",
    isOwner: true,
    item: {
      id: "5",
      title: "Lovevery Play Gym",
      external_url: null,
      image_url: null,
      price: 140.0,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      is_essential: false,
      is_parent_purchased: false,
      notes: "High contrast black & white design",
    },
  },
};

export const NoPrice: Story = {
  args: {
    registryId: "demo",
    isOwner: false,
    item: {
      id: "6",
      title: "Board Books (any!)",
      external_url: null,
      image_url: null,
      price: null,
      quantity_needed: 5,
      quantity_fulfilled: 1,
      is_essential: false,
      is_parent_purchased: false,
      notes: "We love reading — any board books are welcome!",
    },
  },
};

export const GiftGiverView: Story = {
  name: "Gift Giver View (not owner)",
  args: {
    registryId: "demo",
    isOwner: false,
    item: {
      id: "7",
      title: "UPPAbaby Vista V2 Stroller",
      external_url: "https://uppababy.com",
      image_url: null,
      price: 979.99,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      is_essential: true,
      is_parent_purchased: false,
      notes: "This is a big one — group gifting welcome!",
    },
  },
};
