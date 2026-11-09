import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
import { ReserveItemDialog, type GiftActions } from "./reserve-item-dialog";
import type { MyItemGift } from "@/lib/gifts";

// A fixed end date keeps the snapshots the same from day to day. Noon UTC
// shows the same date in any time zone the snapshot browser uses.
const RESERVED_UNTIL = "2026-11-15T12:00:00Z";
const ADDRESS = "123 Main St\nApt 4B\nSan Francisco, CA 94102";

const mockActions: GiftActions = {
  reserve: async (formData) => {
    await new Promise((r) => setTimeout(r, 400));
    const bought = formData.get("alreadyBought") === "1";
    return {
      success: true,
      purchaseId: "p1",
      status: bought ? "purchased" : "reserved",
      reservedUntil: bought ? null : RESERVED_UNTIL,
      shippingAddress: ADDRESS,
    };
  },
  confirm: async () => ({}),
  release: async () => ({}),
};

const soundMachine = {
  id: "1",
  title: "Hatch Rest+ Sound Machine",
  price: 69.99,
  quantity_needed: 1,
  quantity_fulfilled: 0,
  external_url: "https://www.amazon.com/dp/B07WFXGNGB",
};

const reserved: MyItemGift = {
  purchaseId: "p1",
  status: "reserved",
  reservedUntil: RESERVED_UNTIL,
  quantity: 1,
};

const meta: Meta<typeof ReserveItemDialog> = {
  title: "Components/ReserveItemDialog",
  component: ReserveItemDialog,
  parameters: { layout: "centered" },
  args: {
    actions: mockActions,
    parentName: "Remi & Max",
    storeName: "Amazon",
  },
};
export default meta;
type Story = StoryObj<typeof ReserveItemDialog>;

// The dialog starts closed. Open it from the card's button so the snapshot
// shows what's inside.
const openWith =
  (name: RegExp): Story["play"] =>
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name }));
    await screen.findByRole("dialog");
  };

// Step 1. Reserving holds the item for 7 days. "See it" opens the store page.
export const Reserve: Story = {
  args: { item: soundMachine },
  play: openWith(/gift this/i),
};

// Needs more than one, so the form adds a quantity field. No store link.
export const ReserveMultiQuantity: Story = {
  args: {
    item: {
      id: "2",
      title: "Fitted Crib Sheets (Organic Cotton)",
      price: 24.99,
      quantity_needed: 4,
      quantity_fulfilled: 1,
    },
    storeName: undefined,
  },
  play: openWith(/gift this/i),
};

// The guest bought it before coming to the registry.
export const AlreadyBought: Story = {
  args: { item: soundMachine },
  play: async (context) => {
    await openWith(/gift this/i)!(context);
    await context.userEvent.click(screen.getByRole("button", { name: /already bought it/i }));
  },
};

// Step 2, from the card's Finish gift button: the address sits next to the
// store button, before checkout.
export const Buy: Story = {
  args: { item: soundMachine, gift: reserved, shippingAddress: ADDRESS },
  play: openWith(/finish gift/i),
};

// The owners linked their Amazon registry, so the Buy step explains how to buy
// there so the gift counts toward it.
export const BuyOnStoreRegistry: Story = {
  args: {
    item: {
      id: "3",
      title: "Solly Baby Wrap",
      price: 74,
      quantity_needed: 1,
      quantity_fulfilled: 0,
      external_url: "https://www.amazon.com/dp/B0EXAMPLE?colid=EXAMPLE&coliid=EXAMPLE&psc=1",
    },
    registryStoreName: "Amazon",
    gift: reserved,
    shippingAddress: ADDRESS,
  },
  play: openWith(/finish gift/i),
};

// Step 3. Coming back from the store tab, or from "I bought it" in the email.
export const Confirm: Story = {
  args: { item: soundMachine, gift: reserved, initialStep: "confirm" },
  play: async () => {
    await screen.findByRole("dialog");
  },
};

// "Not yet": the reservation stays until its end date.
export const NotYet: Story = {
  args: { item: soundMachine, gift: reserved, initialStep: "confirm" },
  play: async ({ userEvent }) => {
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: /not yet/i }));
  },
};

// The card's Release button, or "I'm not getting it".
export const Release: Story = {
  args: { item: soundMachine, gift: reserved },
  play: openWith(/^release$/i),
};

// After confirming, the card offers the gift's details, with a way to undo it.
export const GiftDetails: Story = {
  args: {
    item: { ...soundMachine, quantity_fulfilled: 1 },
    gift: { ...reserved, status: "purchased", reservedUntil: null },
    shippingAddress: ADDRESS,
  },
  play: openWith(/view your gift/i),
};

// From an email link after the reservation ran out.
export const Ended: Story = {
  args: { item: soundMachine, initialStep: "ended" },
  play: async () => {
    await screen.findByRole("dialog");
  },
};
