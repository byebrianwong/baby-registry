// Server-only: the group gift emails (src/lib/group-gifts.ts). They go through
// mailer.ts, which uses Resend, or Mailpit in the end-to-end tests. The email
// the list's owner gets when the gift is bought is main's usual one, sent by
// sendGiftConfirmedEmails in src/lib/gift-reservations-server.ts.

import { sendEmail } from "@/lib/mailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { groupGiftUrl } from "@/lib/group-gifts";
import { formatAmount } from "@/lib/money";
import { loadGroupGift, type LoadedGroupGift } from "@/lib/group-gifts-server";
import { honoreeDisplayName } from "@/lib/registry-copy";
import {
  groupGiftCalledOffHtml,
  groupGiftNewPledgeHtml,
  groupGiftPledgedHtml,
  groupGiftStartedHtml,
} from "@/lib/group-gift-email-templates";

const FROM = "Regibee <notifications@regibee.com>";

// Resend's free testing sender can only deliver to the account email.
const TEST_RECIPIENT_OVERRIDE = process.env.RESEND_TEST_RECIPIENT;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

async function emailOf(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

function detailsOf(loaded: LoadedGroupGift) {
  return {
    itemTitle: loaded.item?.title ?? "the gift",
    recipientName: honoreeDisplayName(loaded.registry, loaded.registry.title),
    goal: loaded.gift.goal_amount != null ? Number(loaded.gift.goal_amount) : null,
    shareUrl: groupGiftUrl(siteUrl(), loaded.gift.token),
  };
}

async function send(to: string, subject: string, html: string, what: string) {
  try {
    await sendEmail({ from: FROM, to: TEST_RECIPIENT_OVERRIDE || to, subject, html });
  } catch (err) {
    console.error(`[email] Failed to send the group gift ${what} email:`, err);
  }
}

/** Gives the organizer the link to share, right after they start. */
export async function sendGroupGiftStartedEmail(giftToken: string) {
  const loaded = await loadGroupGift(giftToken);
  if (!loaded) return;
  const to = await emailOf(loaded.gift.organizer_id);
  if (!to) return;
  const { itemTitle, recipientName, goal, shareUrl } = detailsOf(loaded);
  await send(
    to,
    `Your group gift for ${recipientName}: "${itemTitle}"`,
    groupGiftStartedHtml({
      organizerName: loaded.organizerName,
      itemTitle,
      recipientName,
      goal: goal ? formatAmount(goal) : null,
      paybackNote: loaded.gift.payback_note,
      shareUrl,
    }),
    "started",
  );
}

/**
 * After someone chips in: their own link, by email, and a note to the
 * organizer. The organizer chipping in on their own gift gets neither.
 */
export async function sendPledgeEmails(giftToken: string, pledgeId: string) {
  const loaded = await loadGroupGift(giftToken);
  const pledge = loaded?.pledges.find((p) => p.id === pledgeId);
  if (!loaded || !pledge) return;
  if (pledge.user_id && pledge.user_id === loaded.gift.organizer_id) return;
  const { itemTitle, recipientName, goal, shareUrl } = detailsOf(loaded);
  const amount = formatAmount(Number(pledge.amount));
  const pledged = loaded.pledges.reduce((sum, p) => sum + Number(p.amount), 0);
  const progress = goal
    ? `${formatAmount(pledged)} of ${formatAmount(goal)}`
    : `${formatAmount(pledged)} so far`;
  const organizerEmail = await emailOf(loaded.gift.organizer_id);

  await Promise.all([
    pledge.email
      ? send(
          pledge.email,
          `You're chipping in ${amount} for "${itemTitle}"`,
          groupGiftPledgedHtml({
            pledgerName: pledge.name,
            organizerName: loaded.organizerName,
            itemTitle,
            recipientName,
            amount,
            paybackNote: loaded.gift.payback_note,
            pledgeUrl: groupGiftUrl(siteUrl(), loaded.gift.token, pledge.token),
          }),
          "pledged",
        )
      : Promise.resolve(),
    organizerEmail
      ? send(
          organizerEmail,
          `${pledge.name} is chipping in ${amount} for "${itemTitle}"`,
          groupGiftNewPledgeHtml({
            organizerName: loaded.organizerName,
            pledgerName: pledge.name,
            amount,
            itemTitle,
            progress,
            shareUrl,
          }),
          "new pledge",
        )
      : Promise.resolve(),
  ]);
}

/** Tells everyone who chipped in that the organizer called it off. */
export async function sendGroupGiftCalledOffEmails(giftToken: string) {
  const loaded = await loadGroupGift(giftToken);
  if (!loaded) return;
  const { itemTitle, recipientName } = detailsOf(loaded);
  await Promise.all(
    loaded.pledges
      .filter((p) => p.email && p.user_id !== loaded.gift.organizer_id)
      .map((p) =>
        send(
          p.email!,
          `The group gift of "${itemTitle}" was called off`,
          groupGiftCalledOffHtml({
            pledgerName: p.name,
            organizerName: loaded.organizerName,
            itemTitle,
            recipientName,
            paid: Boolean(p.paid_at),
          }),
          "called off",
        ),
      ),
  );
}
