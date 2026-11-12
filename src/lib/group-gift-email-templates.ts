/**
 * HTML for the group gift emails (src/lib/group-gifts.ts). Pure functions,
 * like src/lib/email-templates.ts: group-gift-email.ts sends them and
 * Storybook previews them. Every value is escaped, because pledgers type
 * their names on a page anyone with the link can open, and the organizer
 * writes the payback note.
 */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const BUTTON_STYLE =
  "background-color:#004659;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;";

const BOX_STYLE = "background:#F0FAFC;border-radius:12px;padding:14px 16px;line-height:1.6;";

const FOOTNOTE_STYLE = "color:#888;font-size:13px;";

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 8px;"><a href="${escapeHtml(href)}" style="${BUTTON_STYLE}">${escapeHtml(label)}</a></p>`;
}

function paybackBox(organizerName: string, paybackNote: string | null | undefined): string {
  return paybackNote
    ? `<p style="${BOX_STYLE}">Pay ${escapeHtml(organizerName)} back: <strong>${escapeHtml(paybackNote)}</strong></p>`
    : "";
}

/** Sent to the organizer when they start a group gift, with the link to share. */
export function groupGiftStartedHtml(opts: {
  organizerName: string;
  itemTitle: string;
  recipientName: string;
  /** Like "$240". */
  goal?: string | null;
  paybackNote?: string | null;
  shareUrl: string;
}): string {
  return `
    <p>Hi ${escapeHtml(opts.organizerName)},</p>
    <p>Your group gift for ${escapeHtml(opts.recipientName)} is set up: <strong>${escapeHtml(opts.itemTitle)}</strong>${
      opts.goal ? `, collecting ${escapeHtml(opts.goal)}` : ""
    }. It's reserved in your name until you buy it, so nobody else will.</p>
    <p>Send this link to the people chipping in. They don't need an account.</p>
    <p style="${BOX_STYLE}"><a href="${escapeHtml(opts.shareUrl)}" style="color:#004659;word-break:break-all;">${escapeHtml(opts.shareUrl)}</a></p>
    ${opts.paybackNote ? `<p>They'll see how to pay you back: <strong>${escapeHtml(opts.paybackNote)}</strong></p>` : ""}
    ${button(opts.shareUrl, "Open the group gift")}
    <p>When you've bought it, mark it bought on that page, and ${escapeHtml(opts.recipientName)} hears about it the usual way. ${escapeHtml(opts.recipientName)} only sees it's from you and others, never who chipped in.</p>
    <p style="${FOOTNOTE_STYLE}">Anyone with the link can see the group gift and chip in, so only share it with people you trust. You're receiving this because you started a group gift on Regibee.</p>
  `;
}

/** Sent to someone who chipped in, with their own link to change it. */
export function groupGiftPledgedHtml(opts: {
  pledgerName: string;
  organizerName: string;
  itemTitle: string;
  recipientName: string;
  /** Like "$40". */
  amount: string;
  paybackNote?: string | null;
  pledgeUrl: string;
}): string {
  return `
    <p>Hi ${escapeHtml(opts.pledgerName)},</p>
    <p>You're chipping in <strong>${escapeHtml(opts.amount)}</strong> toward <strong>${escapeHtml(opts.itemTitle)}</strong> for ${escapeHtml(opts.recipientName)}. ${escapeHtml(opts.organizerName)} is buying it, so send the money to them.</p>
    ${paybackBox(opts.organizerName, opts.paybackNote)}
    ${button(opts.pledgeUrl, "See the group gift")}
    <p style="${FOOTNOTE_STYLE}">Use that link to change your amount or take it back. It's yours, so don't forward this email. You're receiving this because you chipped in on a Regibee group gift.</p>
  `;
}

/** Tells the organizer that someone chipped in. */
export function groupGiftNewPledgeHtml(opts: {
  organizerName: string;
  pledgerName: string;
  /** Like "$40". */
  amount: string;
  itemTitle: string;
  /** Like "$120 of $240", or "$120 so far". */
  progress: string;
  shareUrl: string;
}): string {
  return `
    <p>Hi ${escapeHtml(opts.organizerName)},</p>
    <p><strong>${escapeHtml(opts.pledgerName)}</strong> is chipping in <strong>${escapeHtml(opts.amount)}</strong> toward <strong>${escapeHtml(opts.itemTitle)}</strong>. That's ${escapeHtml(opts.progress)}.</p>
    <p>Mark it paid on the group gift page once they've sent it.</p>
    ${button(opts.shareUrl, "Open the group gift")}
    <p style="${FOOTNOTE_STYLE}">You're receiving this because you started a group gift on Regibee.</p>
  `;
}

/** Tells someone who chipped in that the organizer called the gift off. */
export function groupGiftCalledOffHtml(opts: {
  pledgerName: string;
  organizerName: string;
  itemTitle: string;
  recipientName: string;
  /** The organizer had marked their pledge paid. */
  paid: boolean;
}): string {
  return `
    <p>Hi ${escapeHtml(opts.pledgerName)},</p>
    <p>${escapeHtml(opts.organizerName)} called off the group gift of <strong>${escapeHtml(opts.itemTitle)}</strong> for ${escapeHtml(opts.recipientName)}, so you don't need to chip in.</p>
    <p>${
      opts.paid
        ? `${escapeHtml(opts.organizerName)} had marked your share as paid. Ask them to send it back.`
        : `If you already sent ${escapeHtml(opts.organizerName)} money for it, ask them to send it back.`
    }</p>
    <p style="${FOOTNOTE_STYLE}">You're receiving this because you chipped in on a Regibee group gift.</p>
  `;
}
