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
  managerInviteHtml,
  supabaseDefaultConfirmSignupHtml,
  confirmSignupHtml,
  supabaseDefaultResetPasswordHtml,
  resetPasswordHtml,
} from "@/lib/email-templates";

const meta: Meta<typeof EmailPreview> = {
  title: "Email Templates",
  component: EmailPreview,
  parameters: { layout: "centered" },
  args: {
    from: "Regibee <notifications@regibee.com>",
    to: "jane@example.com",
  },
};
export default meta;
type Story = StoryObj<typeof EmailPreview>;

const sampleAddress = "123 Main St\nApt 4B\nSan Francisco, CA 94102";

// ── Buyer Confirmations ──────────────────────────────────────

export const BuyerItemReserved: Story = {
  args: {
    subject: 'Your gift is confirmed — "Hatch Rest+ Sound Machine"',
    html: itemReservedBuyerHtml({
      buyerName: "Jane",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 1,
      parentName: "Denise & Brian",
      registryTitle: "Baby Wong Registry",
      shippingAddress: sampleAddress,
      registryUrl: "https://regibee.com/r/baby-wong?email=jane%40example.com&sig=a1b2c3d4e5f6a7b8",
      shopUrl: "https://amazon.com/dp/B07WFXGNGB",
    }),
  },
};

export const BuyerItemReservedMultiQty: Story = {
  args: {
    subject: 'Your gift is confirmed — "Fitted Crib Sheets"',
    html: itemReservedBuyerHtml({
      buyerName: "Jane",
      itemTitle: "Fitted Crib Sheets",
      quantity: 3,
      parentName: "Denise & Brian",
      registryTitle: "Baby Wong Registry",
      registryUrl: "https://regibee.com/r/baby-wong?email=jane%40example.com&sig=a1b2c3d4e5f6a7b8",
    }),
  },
};

export const BuyerItemCovered: Story = {
  args: {
    subject: 'Your gift is confirmed — "UPPAbaby Vista V2 Stroller"',
    html: itemCoveredBuyerHtml({
      buyerName: "Jane",
      itemTitle: "UPPAbaby Vista V2 Stroller",
      parentName: "Denise & Brian",
      registryTitle: "Baby Wong Registry",
      paymentMethods: { venmo: "@brian-wong", paypal: "brian@example.com" },
      registryUrl: "https://regibee.com/r/baby-wong?email=jane%40example.com&sig=a1b2c3d4e5f6a7b8",
      shopUrl: "https://amazon.com/dp/B08XYZ",
    }),
  },
};

export const BuyerCashFundContribution: Story = {
  args: {
    subject: 'Your contribution is confirmed — "Nursery Furniture Fund"',
    html: cashFundContributionBuyerHtml({
      buyerName: "Jane",
      fundTitle: "Nursery Furniture Fund",
      amount: 50,
      parentName: "Denise & Brian",
      registryTitle: "Baby Wong Registry",
      paymentMethods: { venmo: "@brian-wong", zelle: "brian@example.com" },
      registryUrl: "https://regibee.com/r/baby-wong?email=jane%40example.com&sig=a1b2c3d4e5f6a7b8",
    }),
  },
};

// ── Owner Notifications ──────────────────────────────────────

export const OwnerItemReserved: Story = {
  args: {
    subject: 'Jane Doe reserved "Hatch Rest+ Sound Machine"',
    to: "brian@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "Denise",
      registryTitle: "Baby Wong Registry",
      buyerName: "Jane Doe",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 2,
      message: "Can't wait to meet the little one!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=123",
    }),
  },
};

export const OwnerItemCovered: Story = {
  args: {
    subject: 'Jane Doe is covering "UPPAbaby Vista V2 Stroller"',
    to: "brian@example.com",
    html: itemCoveredOwnerHtml({
      ownerName: "Brian",
      registryTitle: "Baby Wong Registry",
      buyerName: "Jane Doe",
      itemTitle: "UPPAbaby Vista V2 Stroller",
      message: "Happy to help with the big stuff!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=456",
    }),
  },
};

export const OwnerCashFundContribution: Story = {
  args: {
    subject: 'Jane Doe contributed $50.00 to "Nursery Furniture Fund"',
    to: "brian@example.com",
    html: cashFundContributionOwnerHtml({
      ownerName: "Brian",
      registryTitle: "Baby Wong Registry",
      buyerName: "Jane Doe",
      fundTitle: "Nursery Furniture Fund",
      amount: 50,
      message: "For a cozy nursery!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=789",
    }),
  },
};

export const OwnerNewSuggestion: Story = {
  args: {
    subject: 'Aunt Mary suggested "Baby Monitor Pro"',
    to: "brian@example.com",
    html: newSuggestionOwnerHtml({
      ownerName: "Brian",
      registryTitle: "Baby Wong Registry",
      suggestedByName: "Aunt Mary",
      title: "Baby Monitor Pro",
      price: 129.99,
      notes: "This is the one we used and it's amazing!",
    }),
  },
};

// ── Multi-Manager Notifications ─────────────────────────────
// When a gift is reserved, ALL managers receive a notification
// addressed to them individually.

export const ManagerNotifDenise: Story = {
  name: "Multi-Manager: Notification to Denise",
  args: {
    subject: '🎁 Jane Doe reserved "Hatch Rest+ Sound Machine"',
    to: "denise@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "Denise",
      registryTitle: "Baby Wong Registry",
      buyerName: "Jane Doe",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 1,
      message: "Can't wait to meet the little one!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=123",
    }),
  },
};

export const ManagerNotifBrian: Story = {
  name: "Multi-Manager: Notification to Brian",
  args: {
    subject: '🎁 Jane Doe reserved "Hatch Rest+ Sound Machine"',
    to: "brian@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "Brian",
      registryTitle: "Baby Wong Registry",
      buyerName: "Jane Doe",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 1,
      message: "Can't wait to meet the little one!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=123",
    }),
  },
};

// ── Missing Name Fallbacks ───────────────────────────────────

export const BuyerItemReservedNoName: Story = {
  name: "Buyer: Item Reserved (No Parent Names Set)",
  args: {
    subject: 'Your gift is confirmed — "Hatch Rest+ Sound Machine"',
    html: itemReservedBuyerHtml({
      buyerName: "Jane",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 1,
      parentName: "the registry owner",
      registryTitle: "Baby Wong Registry",
      shippingAddress: sampleAddress,
      registryUrl: "https://regibee.com/r/baby-wong?email=jane%40example.com&sig=a1b2c3d4e5f6a7b8",
      shopUrl: "https://amazon.com/dp/B07WFXGNGB",
    }),
  },
};

export const OwnerItemReservedNoName: Story = {
  name: "Owner: Item Reserved (No Parent Names Set)",
  args: {
    subject: 'Jane Doe reserved "Hatch Rest+ Sound Machine"',
    to: "brian@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "there",
      registryTitle: "Baby Wong Registry",
      buyerName: "Jane Doe",
      itemTitle: "Hatch Rest+ Sound Machine",
      quantity: 1,
      message: "Can't wait to meet the little one!",
      dashboardLink: "https://regibee.com/dashboard/registry/abc?highlight=123",
    }),
  },
};

// ── Invitations ──────────────────────────────────────────────

export const ManagerInvite: Story = {
  args: {
    subject: 'Denise & Brian invited you to manage "Baby Wong Registry"',
    to: "grandma@example.com",
    html: managerInviteHtml({
      inviterName: "Denise & Brian",
      registryTitle: "Baby Wong Registry",
      inviteUrl: "https://regibee.com/invite/abc123token",
    }),
  },
};

// ── Supabase Auth: Current vs Proposed ───────────────────────

export const AuthSignupCurrent: Story = {
  name: "Auth Signup (Current Supabase Default)",
  args: {
    subject: "Confirm Your Signup",
    from: "Supabase Auth <noreply@mail.app.supabase.io>",
    html: supabaseDefaultConfirmSignupHtml({
      confirmUrl: "https://placeholder.supabase.co/auth/v1/verify?token=abc",
    }),
  },
};

export const AuthSignupProposed: Story = {
  name: "Auth Signup (Proposed Branded)",
  args: {
    subject: "Confirm your Regibee account",
    html: confirmSignupHtml({
      confirmUrl: "https://placeholder.supabase.co/auth/v1/verify?token=abc",
    }),
  },
};

export const AuthResetPasswordCurrent: Story = {
  name: "Auth Reset Password (Current Supabase Default)",
  args: {
    subject: "Reset Password",
    from: "Supabase Auth <noreply@mail.app.supabase.io>",
    html: supabaseDefaultResetPasswordHtml({
      resetUrl: "https://placeholder.supabase.co/auth/v1/verify?token=abc",
    }),
  },
};

export const AuthResetPasswordProposed: Story = {
  name: "Auth Reset Password (Proposed Branded)",
  args: {
    subject: "Reset your Regibee password",
    html: resetPasswordHtml({
      resetUrl: "https://placeholder.supabase.co/auth/v1/verify?token=abc",
    }),
  },
};
