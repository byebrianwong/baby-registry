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
  eventInvitationHtml,
  rsvpGuestConfirmationHtml,
  rsvpHostNotificationHtml,
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
    subject: '🎁 Auntie Glinda reserved "Solly Baby Wrap"',
    to: "max@example.com",
    html: itemReservedOwnerHtml({
      ownerName: "Max",
      registryTitle: "Remi & Max's Baby Registry",
      buyerName: "Auntie Glinda",
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

// ── Events ───────────────────────────────────────────────────

const sampleEventEmail = {
  title: "Remi's Baby Shower",
  hostedBy: "Aunt Linda & Grandma Jo",
  date: "Saturday, March 14, 2026",
  time: "2 – 5 PM PDT",
  locationName: "Grandma Jo's garden",
  locationAddress: "1450 Sunnyside Ave\nBerkeley, CA 94703",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=1450%20Sunnyside%20Ave",
  // Storybook serves public/, so the sample picture loads in the preview.
  imageUrl: "/samples/invitation.svg",
  rsvpBy: "Saturday, March 7, 2026",
  registry: { title: "Remi & Max's Baby Registry", url: "https://regibee.com/r/remi-and-max-baby" },
};

// The reminder only changes the subject and the first line, so it has no story.
export const EventInvitation: Story = {
  args: {
    subject: "You're invited: Remi's Baby Shower",
    from: '"Aunt Linda & Grandma Jo via Regibee" <notifications@regibee.com>',
    html: eventInvitationHtml({
      guestName: "Glinda",
      hostName: "Aunt Linda & Grandma Jo",
      event: sampleEventEmail,
      message:
        "Join us for tea, cake and games as we celebrate Remi and the baby on the way! Bring a favorite children's book instead of a card.",
      rsvpUrl: "https://regibee.com/e/remis-baby-shower-k3m9q2xa?g=Qm9vayBmb3IgYSBiYWJ5",
    }),
  },
};

export const RsvpGuestConfirmation: Story = {
  args: {
    subject: "You're going to Remi's Baby Shower",
    html: rsvpGuestConfirmationHtml({
      guestName: "Glinda",
      status: "yes",
      partySize: 2,
      event: sampleEventEmail,
      rsvpUrl: "https://regibee.com/e/remis-baby-shower-k3m9q2xa?g=Qm9vayBmb3IgYSBiYWJ5",
      calendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    }),
  },
};

export const RsvpHostNotification: Story = {
  args: {
    subject: "Glinda Upland is going to Remi's Baby Shower",
    to: "linda@example.com",
    html: rsvpHostNotificationHtml({
      hostName: "Linda",
      guestName: "Glinda Upland",
      status: "yes",
      partySize: 2,
      note: "Wouldn't miss it! Bringing Goodnight Moon.",
      eventTitle: "Remi's Baby Shower",
      attending: 14,
      pending: 6,
      manageUrl: "https://regibee.com/dashboard/events/abc",
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
