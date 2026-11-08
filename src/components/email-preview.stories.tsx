import type { Meta, StoryObj } from "@storybook/react";
import { EmailPreview } from "./email-preview";
import {
  itemReservedBuyerHtml,
  itemCoveredBuyerHtml,
  cashFundContributionBuyerHtml,
  itemReservedOwnerHtml,
  itemCoveredOwnerHtml,
  cashFundContributionOwnerHtml,
  newSuggestionOwnerHtml,
  completionDiscountOwnerHtml,
  managerInviteHtml,
  followRequestHtml,
  confirmSignupHtml,
  resetPasswordHtml,
} from "@/lib/email-templates";

const meta: Meta<typeof EmailPreview> = {
  title: "Email Templates",
  component: EmailPreview,
  parameters: { layout: "centered" },
  args: {
    from: "Regibee <notifications@regibee.com>",
    to: "glinda@example.com",
  },
};
export default meta;
type Story = StoryObj<typeof EmailPreview>;

// One story per template. Add a second story for a template only when an
// option changes its layout, not just its wording.

const sampleAddress = "123 Main St\nApt 4B\nSan Francisco, CA 94102";

// ── Buyer Confirmations ──────────────────────────────────────

export const BuyerItemReserved: Story = {
  args: {
    subject: 'Your gift is confirmed — "Hatch Rest+ Sound Machine"',
    html: itemReservedBuyerHtml({
      buyerName: "Glinda",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 1,
      parentName: "Remi & Max",
      registryTitle: "Remi & Max's Baby Registry",
      shippingAddress: sampleAddress,
      registryUrl: "https://regibee.com/r/remi-and-max?email=glinda%40example.com&sig=a1b2c3d4e5f6a7b8",
      shopUrl: "https://amazon.com/dp/B07WFXGNGB",
    }),
  },
};

export const BuyerItemCovered: Story = {
  args: {
    subject: 'Your gift is confirmed — "UPPAbaby Vista V2 Stroller"',
    html: itemCoveredBuyerHtml({
      buyerName: "Glinda",
      itemTitle: "UPPAbaby Vista V2 Stroller",
      parentName: "Remi & Max",
      registryTitle: "Remi & Max's Baby Registry",
      paymentMethods: { venmo: "@remi-and-max", paypal: "max@example.com" },
      registryUrl: "https://regibee.com/r/remi-and-max?email=glinda%40example.com&sig=a1b2c3d4e5f6a7b8",
      shopUrl: "https://amazon.com/dp/B08XYZ",
    }),
  },
};

export const BuyerCashFundContribution: Story = {
  args: {
    subject: 'Your contribution is confirmed — "Nursery Furniture Fund"',
    html: cashFundContributionBuyerHtml({
      buyerName: "Glinda",
      fundTitle: "Nursery Furniture Fund",
      amount: 50,
      parentName: "Remi & Max",
      registryTitle: "Remi & Max's Baby Registry",
      paymentMethods: { venmo: "@remi-and-max", zelle: "max@example.com" },
      registryUrl: "https://regibee.com/r/remi-and-max?email=glinda%40example.com&sig=a1b2c3d4e5f6a7b8",
    }),
  },
};

// ── Owner Notifications ──────────────────────────────────────

export const OwnerItemReserved: Story = {
  args: {
    subject: 'Auntie Glinda reserved "Hatch Rest+ Sound Machine"',
    to: "max@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      buyerName: "Auntie Glinda",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 2,
      message: "Can't wait to meet the little one!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=123",
    }),
  },
};

// The first gift from a store registry adds a note about its welcome box.
export const OwnerItemReservedWelcomeBox: Story = {
  args: {
    subject: '🎁 Jane Doe reserved "Solly Baby Wrap"',
    to: "max@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      buyerName: "Jane Doe",
      itemTitle: "Solly Baby Wrap",
      quantity: 1,
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=123",
      welcomeBox: {
        storeName: "Amazon",
        boxName: "welcome box",
        perksLink: "https://regibee.com/dashboard/registry/abc?tab=perks",
      },
    }),
  },
};

export const OwnerItemCovered: Story = {
  args: {
    subject: 'Auntie Glinda is covering "UPPAbaby Vista V2 Stroller"',
    to: "max@example.com",
    html: itemCoveredOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      buyerName: "Auntie Glinda",
      itemTitle: "UPPAbaby Vista V2 Stroller",
      message: "Happy to help with the big stuff!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=456",
    }),
  },
};

export const OwnerCashFundContribution: Story = {
  args: {
    subject: 'Auntie Glinda contributed $50.00 to "Nursery Furniture Fund"',
    to: "max@example.com",
    html: cashFundContributionOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      buyerName: "Auntie Glinda",
      fundTitle: "Nursery Furniture Fund",
      amount: 50,
      message: "For a cozy nursery!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=789",
    }),
  },
};

export const OwnerNewSuggestion: Story = {
  args: {
    subject: 'Uncle Oz suggested "Baby Monitor Pro"',
    to: "max@example.com",
    html: newSuggestionOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      suggestedByName: "Uncle Oz",
      title: "Baby Monitor Pro",
      price: 129.99,
      notes: "This is the one we used and it's amazing!",
    }),
  },
};

// ── Store perks ──────────────────────────────────────────────

export const OwnerCompletionDiscount: Story = {
  args: {
    subject: "Your store completion discounts may be open",
    to: "max@example.com",
    html: completionDiscountOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      stores: [
        { name: "Amazon", amount: "10% off, or 15% with Prime" },
        { name: "Babylist", amount: "15% off Babylist Shop items" },
      ],
      perksLink: "https://regibee.com/dashboard/registry/abc?tab=perks",
    }),
  },
};

// ── Invitations ──────────────────────────────────────────────

export const ManagerInvite: Story = {
  args: {
    subject: `Remi & Max invited you to manage "Remi & Max's Baby Registry"`,
    to: "dorothy@example.com",
    html: managerInviteHtml({
      inviterName: "Remi & Max",
      registryTitle: "Remi & Max's Baby Registry",
      inviteUrl: "https://regibee.com/invite/abc123token",
    }),
  },
};

// ── Supabase Auth ────────────────────────────────────────────

export const AuthSignupProposed: Story = {
  name: "Auth Signup (Proposed Branded)",
  args: {
    subject: "Confirm your Regibee account",
    to: "max@example.com",
    html: confirmSignupHtml({
      confirmUrl: "https://placeholder.supabase.co/auth/v1/verify?token=abc",
    }),
  },
};

export const AuthResetPasswordProposed: Story = {
  name: "Auth Reset Password (Proposed Branded)",
  args: {
    subject: "Reset your Regibee password",
    to: "max@example.com",
    html: resetPasswordHtml({
      resetUrl: "https://placeholder.supabase.co/auth/v1/verify?token=abc",
    }),
  },
};

// ── Follows ──────────────────────────────────────────────────

export const FollowRequest: Story = {
  args: {
    subject: "Grandma Dorothy wants to follow you on Regibee",
    to: "max@example.com",
    html: followRequestHtml({
      followerName: "Grandma Dorothy",
      followerUsername: "grandma-dorothy",
      profileUrl: "https://regibee.com/u/grandma-dorothy",
      reviewUrl: "https://regibee.com/dashboard/account#follows",
      settingsUrl: "https://regibee.com/dashboard/account",
    }),
  },
};
