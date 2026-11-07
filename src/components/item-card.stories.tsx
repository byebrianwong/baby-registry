import type { Meta, StoryObj } from "@storybook/react";
import { ItemCard } from "./item-card";

// The app shows this card only to registry owners (on the dashboard), so every
// story uses isOwner. Gift givers see a different card on the public page.
const meta: Meta<typeof ItemCard> = {
  title: "Components/ItemCard",
  component: ItemCard,
  parameters: {
    layout: "padded",
  },
  args: {
    registryId: "demo",
    isOwner: true,
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

// Still needed: product photo, "Most wanted" tag, and the Shop and
// "Mark as bought by parent" buttons.
export const WithImage: Story = {
  args: {
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
      is_open_to_used: false,
      minimum_condition: null,
      category_id: null,
    },
  },
};

// Gifted by someone: faded card, "Gifted" tag, no action buttons. No photo,
// so it shows the placeholder image.
export const Fulfilled: Story = {
  args: {
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
      is_open_to_used: false,
      minimum_condition: null,
      category_id: null,
    },
  },
};

// Bought by the parents: grey card, "Purchased by you" tag, and an undo button.
export const ParentPurchased: Story = {
  args: {
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
      is_open_to_used: false,
      minimum_condition: null,
      category_id: null,
    },
  },
};
