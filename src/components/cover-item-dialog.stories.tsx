import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent, screen } from "storybook/test";
import { CoverItemDialog, type CoverActions } from "./cover-item-dialog";
import type { MyItemGift } from "@/lib/gifts";

const mockActions: CoverActions = {
  give: async () => {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true, purchaseId: "p1" };
  },
  release: async () => ({}),
};

const stroller = {
  id: "1",
  title: "UPPAbaby Vista V2 Stroller",
  price: 979.99,
  quantity_needed: 1,
};

const given: MyItemGift = {
  purchaseId: "p1",
  status: "purchased",
  reservedUntil: null,
  quantity: 1,
};

const meta: Meta<typeof CoverItemDialog> = {
  title: "Components/CoverItemDialog",
  component: CoverItemDialog,
  parameters: { layout: "centered" },
  args: {
    actions: mockActions,
    parentName: "Remi & Max",
    paymentMethods: {
      venmo: "@remi-and-max",
      paypal: "paypal.me/remiandmax",
      zelle: "max@example.com",
    },
  },
};
export default meta;
type Story = StoryObj<typeof CoverItemDialog>;

// fireEvent.input sets the value the way React expects. user-event's typing
// doesn't reach these fields.
const fill = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } });

// The dialog starts closed. Open it from the card's button so the snapshot
// shows what's inside.
const openWith =
  (name: RegExp): Story["play"] =>
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name }));
    await screen.findByRole("dialog");
  };

// Pay first: the amount, then a button per payment app with the amount filled
// in. Zelle has no link, so its handle has a Copy button.
export const Pay: Story = {
  args: { item: stroller },
  play: openWith(/gift this/i),
};

// Needs more than one, so the amount follows how many the guest gives.
export const PayMultiQuantity: Story = {
  args: {
    item: { id: "4", title: "Muslin Swaddle Blankets", price: 12.99, quantity_needed: 5 },
    availableToGift: 3,
    paymentMethods: { venmo: "@remi-and-max" },
  },
  play: async (context) => {
    await openWith(/gift this/i)!(context);
    fill(screen.getByLabelText(/how many/i), "2");
    await screen.findByText("$25.98");
  },
};

// A PayPal email and a phone number can't become links, so both get Copy.
export const PayByCopying: Story = {
  args: {
    item: stroller,
    paymentMethods: { paypal: "max@example.com", zelle: "(415) 555-0134" },
  },
  play: openWith(/gift this/i),
};

// The owners haven't added a way to pay yet.
export const NoPaymentMethods: Story = {
  args: { item: stroller, paymentMethods: undefined },
  play: openWith(/gift this/i),
};

// Saving failed, here because another guest gave the last one first.
export const SaveError: Story = {
  args: {
    item: stroller,
    actions: { give: async () => ({ error: "Other guests have already given this." }) },
  },
  play: async (context) => {
    await openWith(/gift this/i)!(context);
    fill(screen.getByLabelText(/your name/i), "Glinda");
    fill(screen.getByLabelText(/your email/i), "glinda@example.com");
    // Submit the form rather than click the button. After a click, the
    // button's ring differs from one snapshot run to the next.
    fireEvent.submit(screen.getByRole("button", { name: /i sent/i }).closest("form")!);
    await screen.findByText(/already given this/i);
  },
};

// After "I sent $979.99". The gift is saved as given straight away.
export const Done: Story = {
  args: { item: stroller },
  // No confetti in the snapshot.
  parameters: { chromatic: { prefersReducedMotion: "reduce" } },
  play: async (context) => {
    await openWith(/gift this/i)!(context);
    fill(screen.getByLabelText(/your name/i), "Glinda");
    fill(screen.getByLabelText(/your email/i), "glinda@example.com");
    await context.userEvent.click(screen.getByRole("button", { name: /i sent/i }));
    await screen.findByText(/thank you/i);
  },
};

// Later, the card offers the gift's details, with a way to undo it.
export const GiftDetails: Story = {
  args: { item: stroller, availableToGift: 0, gift: given },
  play: openWith(/view your gift/i),
};

// From "Undo this gift" in the guest's email, or in the details.
export const Undo: Story = {
  args: { item: stroller, availableToGift: 0, gift: given, initialStep: "release" },
  play: async () => {
    await screen.findByRole("dialog");
  },
};

// The email's link after the gift was already undone.
export const Ended: Story = {
  args: { item: stroller, initialStep: "ended" },
  play: async () => {
    await screen.findByRole("dialog");
  },
};
