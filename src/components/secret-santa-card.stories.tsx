import type { Meta, StoryObj } from "@storybook/react";
import { SecretSantaCard } from "./secret-santa-card";
import { sampleExchangeEvent } from "@/lib/event-sample-data";

// What a guest sees on their own RSVP link once names are drawn. It sits
// above the RSVP box on the event page.

const meta: Meta<typeof SecretSantaCard> = {
  title: "Components/SecretSantaCard",
  component: SecretSantaCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SecretSantaCard>;

/**
 * The person drew someone with a Regibee wishlist and gift ideas. The button
 * goes through the event, so the gift shows up as from "Secret Santa".
 */
export const RegibeeWishlistAndIdeas: Story = {
  args: {
    giftee: {
      name: "Elphaba",
      wishlistUrl: "https://regibee.com/r/elphabas-wishlist-3k9d",
      wishlistTitle: "Elphaba's Wishlist",
      giftIdeas: "Books about animals, green tea, a sturdy umbrella",
      shippingAddress: null,
    },
    budget: "$25",
    mailed: false,
    wishlistHref: `/e/${sampleExchangeEvent.slug}/gifts?g=token-g5&to=elphabas-wishlist-3k9d`,
  },
};

/** Gifts are mailed. This wishlist is at another store, so it opens in a new tab. */
export const MailedWithAddress: Story = {
  args: {
    giftee: {
      name: "Fiyero",
      wishlistUrl: "https://www.amazon.com/hz/wishlist/ls/EXAMPLE",
      wishlistTitle: null,
      giftIdeas: null,
      shippingAddress: "Fiyero Tigelaar\n12 Vinkus Way\nPortland, OR 97201",
    },
    budget: "$30",
    mailed: true,
    wishlistHref: "https://www.amazon.com/hz/wishlist/ls/EXAMPLE",
  },
};

/** The person they drew hasn't added anything yet: no wishlist, ideas or address. */
export const NothingAddedYet: Story = {
  args: {
    giftee: { name: "Boq", wishlistUrl: null, wishlistTitle: null, giftIdeas: null, shippingAddress: null },
    budget: null,
    mailed: true,
    wishlistHref: null,
  },
};
