import type { Meta, StoryObj } from "@storybook/react";
import { EmailPreview } from "./email-preview";
import {
  groupGiftCalledOffHtml,
  groupGiftNewPledgeHtml,
  groupGiftPledgedHtml,
  groupGiftStartedHtml,
} from "@/lib/group-gift-email-templates";

const SHARE_URL = "https://regibee.com/group-gift/story-group-gift-token-0000";

const meta: Meta<typeof EmailPreview> = {
  title: "Email Templates/Group gifts",
  component: EmailPreview,
  parameters: { layout: "centered" },
  args: { from: "Regibee <notifications@regibee.com>" },
};
export default meta;
type Story = StoryObj<typeof EmailPreview>;

/** To the organizer, with the link to share. */
export const Started: Story = {
  args: {
    to: "oz@example.com",
    subject: 'Your group gift for Dorothy: "Hot air balloon ride for two"',
    html: groupGiftStartedHtml({
      organizerName: "Uncle Oz",
      itemTitle: "Hot air balloon ride for two",
      recipientName: "Dorothy",
      goal: "$240",
      paybackNote: "Venmo @uncle-oz",
      shareUrl: SHARE_URL,
    }),
  },
};

/** To someone who chipped in, with their own link to change it. */
export const Pledged: Story = {
  args: {
    to: "glinda@example.com",
    subject: 'You\'re chipping in $40 for "Hot air balloon ride for two"',
    html: groupGiftPledgedHtml({
      pledgerName: "Glinda Good",
      organizerName: "Uncle Oz",
      itemTitle: "Hot air balloon ride for two",
      recipientName: "Dorothy",
      amount: "$40",
      paybackNote: "Venmo @uncle-oz",
      pledgeUrl: `${SHARE_URL}?p=story-pledge-token-glinda-00`,
    }),
  },
};

/** To the organizer when someone chips in. */
export const NewPledge: Story = {
  args: {
    to: "oz@example.com",
    subject: 'Glinda Good is chipping in $40 for "Hot air balloon ride for two"',
    html: groupGiftNewPledgeHtml({
      organizerName: "Uncle Oz",
      pledgerName: "Glinda Good",
      amount: "$40",
      itemTitle: "Hot air balloon ride for two",
      progress: "$145 of $240",
      shareUrl: SHARE_URL,
    }),
  },
};

/** To everyone who chipped in, when the organizer calls it off. */
export const CalledOff: Story = {
  args: {
    to: "glinda@example.com",
    subject: 'The group gift of "Hot air balloon ride for two" was called off',
    html: groupGiftCalledOffHtml({
      pledgerName: "Glinda Good",
      organizerName: "Uncle Oz",
      itemTitle: "Hot air balloon ride for two",
      recipientName: "Dorothy",
      paid: true,
    }),
  },
};
