import type { Meta, StoryObj } from "@storybook/react";
import { screen, within } from "storybook/test";
import { DeleteAccountCard } from "./delete-account-card";
import type { AccountDeletionSummary } from "@/lib/account-deletion-summary";

// Someone with one registry of their own, one they share with their partner,
// one they help with for a friend, and two events.
const mixed: AccountDeletionSummary = {
  deleted: [{ title: "Max's 30th Birthday", gifts: 3 }],
  handedOver: [{ title: "Remi & Max's Baby Registry", newOwner: "Remi Kim" }],
  leaving: [{ title: "Grandma Dorothy's Wish List" }],
  events: 2,
};

const meta: Meta<typeof DeleteAccountCard> = {
  title: "Components/DeleteAccountCard",
  component: DeleteAccountCard,
  args: {
    loadSummary: async () => mixed,
    deleteAction: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return {};
    },
  },
};
export default meta;
type Story = StoryObj<typeof DeleteAccountCard>;

// The card starts with only its button. Open the dialog so the snapshot shows
// what it says.
const open: Story["play"] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /delete account/i }));
  await screen.findByRole("dialog");
  await screen.findByRole("list");
};

// What happens to each registry and event, then the word to type. The button
// stays off until it's typed.
export const Confirm: Story = { play: open };

// A new account with nothing in it yet: only the profile and sign-in go.
export const NewAccount: Story = {
  args: { loadSummary: async () => ({ deleted: [], handedOver: [], leaving: [], events: 0 }) },
  play: open,
};

// "delete" typed, so the button is on.
export const ReadyToDelete: Story = {
  play: async (context) => {
    await open(context);
    await context.userEvent.type(screen.getByLabelText(/to confirm/i), "delete");
  },
};

// The server said no. The dialog stays open with the reason.
export const Failed: Story = {
  args: { deleteAction: async () => ({ error: "We couldn't delete your account. Try again." }) },
  play: async (context) => {
    await open(context);
    await context.userEvent.type(screen.getByLabelText(/to confirm/i), "delete");
    const dialog = within(screen.getByRole("dialog"));
    await context.userEvent.click(dialog.getByRole("button", { name: /delete account/i }));
    await dialog.findByText(/couldn't delete/i);
  },
};
