/**
 * Pure HTML template functions for all Regibee emails.
 * Used by email.ts for sending and by Storybook for visual preview.
 */

import { formatPrice } from "@/lib/money";

// Every value that goes into an email is escaped: guests type names, messages
// and suggestions on a public page, and owners and managers set titles, names,
// addresses and links. Without this, anyone with a registry link could put
// their own links or images into an email sent from Regibee. Links are escaped
// too, because they go inside an href="" attribute.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function formatPaymentBlock(paymentMethods?: { venmo?: string; paypal?: string; zelle?: string }): string {
  if (!paymentMethods || (!paymentMethods.venmo && !paymentMethods.paypal && !paymentMethods.zelle)) {
    return "";
  }
  const lines = [];
  if (paymentMethods.venmo) lines.push(`Venmo: ${escapeHtml(paymentMethods.venmo)}`);
  if (paymentMethods.paypal) lines.push(`PayPal: ${escapeHtml(paymentMethods.paypal)}`);
  if (paymentMethods.zelle) lines.push(`Zelle: ${escapeHtml(paymentMethods.zelle)}`);
  return `<p style="color:#999;font-size:13px;">If not sent yet, send payment via:<br/>${lines.join("<br/>")}</p>`;
}

// ── Buyer Confirmations ──────────────────────────────────────

function buttonLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="background-color: #004659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">${escapeHtml(label)}</a>`;
}

function textLinks(links: { href?: string; label: string }[]): string {
  const html = links
    .filter((l) => l.href)
    .map((l) => `<a href="${escapeHtml(l.href!)}" style="color:#004659;">${escapeHtml(l.label)}</a>`)
    .join(" &nbsp;|&nbsp; ");
  return html ? `<p style="margin: 16px 0;">${html}</p>` : "";
}

function addressBlock(shippingAddress?: string): string {
  return shippingAddress
    ? `<p><strong>Ship to:</strong><br/>${escapeHtml(shippingAddress).replace(/\n/g, "<br/>")}</p>`
    : "";
}

/** Sent when a guest reserves an item. The item is held for them while they buy it. */
export function itemReservedBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  quantity: number;
  parentName: string;
  registryTitle: string;
  holdDays: number;
  shippingAddress?: string;
  shopUrl?: string;
  storeName?: string;
  confirmUrl: string;
  releaseUrl: string;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";
  const buyLabel = opts.storeName ? `Buy at ${opts.storeName}` : "Buy it";

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>You reserved <strong>${escapeHtml(opts.itemTitle)}</strong>${qtyText} on <em>${escapeHtml(opts.registryTitle)}</em>. It's held for you for ${opts.holdDays} days, so nobody else buys it.</p>
    ${addressBlock(opts.shippingAddress)}
    ${opts.shopUrl ? `<p style="margin: 24px 0 16px;">${buttonLink(opts.shopUrl, buyLabel)}</p>` : ""}
    <p>When you've bought it, tell ${escapeHtml(opts.parentName)} so they know it's from you.</p>
    ${textLinks([
      { href: opts.confirmUrl, label: "I bought it" },
      { href: opts.releaseUrl, label: "I'm not getting it" },
    ])}
    <p style="color:#888;font-size:13px;">If you don't confirm within ${opts.holdDays} days, the item goes back on the list for other guests. You're receiving this because you reserved a gift on a Regibee registry.</p>
  `;
}

/** Sent before a guest's reservation runs out. */
export function itemReservationReminderBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  parentName: string;
  registryTitle: string;
  /** Whole days left, rounded up. 1 means it ends within a day. */
  daysLeft: number;
  shippingAddress?: string;
  shopUrl?: string;
  storeName?: string;
  confirmUrl: string;
  releaseUrl: string;
}): string {
  const when = opts.daysLeft <= 1 ? "ends tomorrow" : `ends in ${opts.daysLeft} days`;
  const buyLabel = opts.storeName ? `Buy at ${opts.storeName}` : "Buy it";

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Your reservation of <strong>${escapeHtml(opts.itemTitle)}</strong> on <em>${escapeHtml(opts.registryTitle)}</em> ${when}. After that, it goes back on the list for other guests.</p>
    ${addressBlock(opts.shippingAddress)}
    ${opts.shopUrl ? `<p style="margin: 24px 0 16px;">${buttonLink(opts.shopUrl, buyLabel)}</p>` : ""}
    <p>Already bought it? Tell ${escapeHtml(opts.parentName)} so they know it's from you.</p>
    ${textLinks([
      { href: opts.confirmUrl, label: "I bought it" },
      { href: opts.releaseUrl, label: "I'm not getting it" },
    ])}
    <p style="color:#888;font-size:13px;">You're receiving this because you reserved a gift on a Regibee registry.</p>
  `;
}

/** Sent when a reservation ran out and the item went back on the list. */
export function itemReservationEndedBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  registryTitle: string;
  registryUrl?: string;
}): string {
  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Your reservation of <strong>${escapeHtml(opts.itemTitle)}</strong> on <em>${escapeHtml(opts.registryTitle)}</em> ended, so it's back on the list for other guests.</p>
    <p>If you bought it anyway, or still want to, reserve it again on the registry. If someone else has, you could pick another gift.</p>
    ${textLinks([{ href: opts.registryUrl, label: "View Registry" }])}
    <p style="color:#888;font-size:13px;">You're receiving this because you reserved a gift on a Regibee registry.</p>
  `;
}

/** Sent when a guest says they bought the item. */
export function itemGivenBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  quantity: number;
  parentName: string;
  registryTitle: string;
  registryUrl?: string;
  undoUrl?: string;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Thanks for giving <strong>${escapeHtml(opts.itemTitle)}</strong>${qtyText} from <em>${escapeHtml(opts.registryTitle)}</em>!</p>
    <p>${escapeHtml(opts.parentName)} will see it's from you, and will really appreciate it.</p>
    ${textLinks([
      { href: opts.registryUrl, label: "View Registry" },
      { href: opts.undoUrl, label: "Undo this gift" },
    ])}
    <p style="color:#888;font-size:13px;">You're receiving this because you gave a gift on a Regibee registry.</p>
  `;
}

export function itemCoveredBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  parentName: string;
  registryTitle: string;
  paymentMethods?: { venmo?: string; paypal?: string; zelle?: string };
  registryUrl?: string;
  shopUrl?: string;
}): string {
  const paymentBlock = formatPaymentBlock(opts.paymentMethods);
  const linksBlock = [
    opts.registryUrl ? `<a href="${escapeHtml(opts.registryUrl)}" style="color:#004659;">View Registry</a>` : "",
    opts.shopUrl ? `<a href="${escapeHtml(opts.shopUrl)}" style="color:#004659;">Shop This Item</a>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Thanks for gifting <strong>${escapeHtml(opts.itemTitle)}</strong> on <em>${escapeHtml(opts.registryTitle)}</em>!</p>
    <p>${escapeHtml(opts.parentName)} will really appreciate it.</p>
    ${paymentBlock}
    ${linksBlock ? `<p style="margin: 16px 0;">${linksBlock}</p>` : ""}
    <p style="color:#888;font-size:13px;">You're receiving this because you covered a gift on a Regibee registry.</p>
  `;
}

export function cashFundContributionBuyerHtml(opts: {
  buyerName: string;
  fundTitle: string;
  amount: number;
  parentName: string;
  registryTitle: string;
  paymentMethods?: { venmo?: string; paypal?: string; zelle?: string };
  registryUrl?: string;
}): string {
  const formatted = formatPrice(opts.amount);
  const paymentBlock = formatPaymentBlock(opts.paymentMethods);
  const linkBlock = opts.registryUrl
    ? `<p style="margin: 16px 0;"><a href="${escapeHtml(opts.registryUrl)}" style="color:#004659;">View Registry</a></p>`
    : "";

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Thanks for contributing <strong>${formatted}</strong> to <strong>${escapeHtml(opts.fundTitle)}</strong> on <em>${escapeHtml(opts.registryTitle)}</em>!</p>
    <p>${escapeHtml(opts.parentName)} will really appreciate it.</p>
    ${paymentBlock}
    ${linkBlock}
    <p style="color:#888;font-size:13px;">You're receiving this because you contributed to a cash fund on a Regibee registry.</p>
  `;
}

// ── Owner Notifications ──────────────────────────────────────

/** Sent to the owners and managers when a guest says they bought an item. */
export function itemGivenOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  message?: string | null;
  dashboardLink: string;
  /** Set when this is the first gift from a store registry whose welcome box needs one. */
  welcomeBox?: { storeName: string; boxName: string; perksLink: string } | null;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";
  const welcomeBlock = opts.welcomeBox
    ? `<p style="background:#EAFBF5;border:1px solid #A0E4D4;border-radius:12px;padding:12px 14px;color:#074D31;">This is the first gift from your ${escapeHtml(opts.welcomeBox.storeName)} registry, so you may be able to request your ${escapeHtml(opts.welcomeBox.storeName)} ${escapeHtml(opts.welcomeBox.boxName)} now. <a href="${escapeHtml(opts.welcomeBox.perksLink)}" style="color:#004659;">See your store perks</a></p>`
    : "";

  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p><strong>${escapeHtml(opts.buyerName)}</strong> bought <strong>${escapeHtml(opts.itemTitle)}</strong>${qtyText} from your registry <em>${escapeHtml(opts.registryTitle)}</em>.</p>
    ${opts.message ? `<p>Their message: "${escapeHtml(opts.message)}"</p>` : ""}
    ${welcomeBlock}
    <p style="margin: 16px 0;"><a href="${escapeHtml(opts.dashboardLink)}" style="color:#004659;">View on Dashboard</a></p>
    <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your registry.</p>
  `;
}

export function itemCoveredOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  buyerName: string;
  itemTitle: string;
  message?: string | null;
  dashboardLink: string;
}): string {
  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p><strong>${escapeHtml(opts.buyerName)}</strong> offered to cover the cost of <strong>${escapeHtml(opts.itemTitle)}</strong> on your registry <em>${escapeHtml(opts.registryTitle)}</em>.</p>
    ${opts.message ? `<p>Their message: "${escapeHtml(opts.message)}"</p>` : ""}
    <p style="margin: 16px 0;"><a href="${escapeHtml(opts.dashboardLink)}" style="color:#004659;">View on Dashboard</a></p>
    <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your registry.</p>
  `;
}

export function cashFundContributionOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  buyerName: string;
  fundTitle: string;
  amount: number;
  message?: string | null;
  dashboardLink: string;
}): string {
  const formatted = formatPrice(opts.amount);

  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p><strong>${escapeHtml(opts.buyerName)}</strong> contributed <strong>${formatted}</strong> to your cash fund <strong>${escapeHtml(opts.fundTitle)}</strong> on <em>${escapeHtml(opts.registryTitle)}</em>.</p>
    ${opts.message ? `<p>Their message: "${escapeHtml(opts.message)}"</p>` : ""}
    <p style="margin: 16px 0;"><a href="${escapeHtml(opts.dashboardLink)}" style="color:#004659;">View on Dashboard</a></p>
    <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your registry.</p>
  `;
}

export function newSuggestionOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  suggestedByName: string;
  title: string;
  price?: number | null;
  notes?: string | null;
}): string {
  const priceText = opts.price ? ` (${formatPrice(opts.price)})` : "";

  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p><strong>${escapeHtml(opts.suggestedByName)}</strong> suggested adding <strong>${escapeHtml(opts.title)}</strong>${priceText} to your registry <em>${escapeHtml(opts.registryTitle)}</em>.</p>
    ${opts.notes ? `<p>Their note: "${escapeHtml(opts.notes)}"</p>` : ""}
    <p>Head to your dashboard to accept or decline this suggestion.</p>
    <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your registry.</p>
  `;
}

// ── Store perks ──────────────────────────────────────────────

export function completionDiscountOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  /** Stores whose completion discount may have opened, with the discount. */
  stores: { name: string; amount: string }[];
  perksLink: string;
}): string {
  const items = opts.stores
    .map((s) => `<li><strong>${escapeHtml(s.name)}</strong>: ${escapeHtml(s.amount)}</li>`)
    .join("");
  const one = opts.stores.length === 1;

  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p>Your due date is coming up, so ${one ? "this store's completion discount" : "these stores' completion discounts"} may be open now. ${one ? "It's" : "Each is"} a discount on what's still left on your store registry.</p>
    <ul style="padding-left:20px;">${items}</ul>
    <p>Rules differ by store, so check ${one ? "the store's" : "each store's"} terms before you buy.</p>
    <p style="margin: 16px 0;"><a href="${escapeHtml(opts.perksLink)}" style="color:#004659;">See your store perks</a></p>
    <p style="color:#888;font-size:13px;">You're receiving this because you linked store registries to <em>${escapeHtml(opts.registryTitle)}</em>. You can turn off these emails on its Store perks tab.</p>
  `;
}

// ── Invitations ──────────────────────────────────────────────

export function managerInviteHtml(opts: {
  inviterName: string;
  registryTitle: string;
  inviteUrl: string;
}): string {
  return `
    <p>Hi there,</p>
    <p><strong>${escapeHtml(opts.inviterName)}</strong> invited you to help manage the registry <strong>${escapeHtml(opts.registryTitle)}</strong>.</p>
    <p>As a manager, you'll be able to add and edit items, view gift activity, and help organize the registry.</p>
    <p style="margin: 24px 0;">
      <a href="${escapeHtml(opts.inviteUrl)}" style="background-color: #004659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color:#888;font-size:13px;">Or copy this link: ${escapeHtml(opts.inviteUrl)}</p>
    <p style="color:#888;font-size:13px;">This invite expires in 7 days.</p>
  `;
}

// ── Follows ──────────────────────────────────────────────────

export function followRequestHtml(opts: {
  followerName: string;
  followerUsername: string;
  profileUrl: string;
  reviewUrl: string;
  settingsUrl: string;
}): string {
  const name = escapeHtml(opts.followerName);
  const username = escapeHtml(opts.followerUsername);
  return `
    <p>Hi there,</p>
    <p><strong>${name}</strong> (@${username}) asked to follow you on Regibee.</p>
    <p>If you approve, they'll see the private registries on your profile as well as your public ones. If you don't know them, you can decline the request or block them.</p>
    <p style="margin: 24px 0;">
      <a href="${escapeHtml(opts.reviewUrl)}" style="background-color: #004659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Review request
      </a>
    </p>
    <p style="color:#888;font-size:13px;">See their profile: ${escapeHtml(opts.profileUrl)}</p>
    <p style="color:#888;font-size:13px;">You're getting this because someone asked to follow you on Regibee. To stop these emails, turn them off on your account page: ${escapeHtml(opts.settingsUrl)}</p>
  `;
}

// ── Supabase Auth Templates ──────────────────────────────────
// Branded templates to replace Supabase's default auth emails.
// In the Supabase dashboard, use {{ .ConfirmationURL }} for confirmUrl
// and {{ .SiteURL }} for siteUrl.

export function confirmSignupHtml(opts: {
  confirmUrl: string;
}): string {
  return `
    <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #181d27;">
      <div style="text-align: center; padding: 32px 0 24px;">
        <h1 style="font-size: 20px; margin: 12px 0 0; color: #004659;">Regibee</h1>
      </div>
      <h2 style="font-size: 18px; text-align: center;">Confirm your email</h2>
      <p style="color: #414651; line-height: 1.6;">Thanks for signing up! Click the button below to confirm your email address and start building your registry.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${opts.confirmUrl}" style="background-color: #004659; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          Confirm Email
        </a>
      </p>
      <p style="color:#888;font-size:13px;text-align:center;">If you didn't create an account on Regibee, you can safely ignore this email.</p>
    </div>
  `;
}

export function resetPasswordHtml(opts: {
  resetUrl: string;
}): string {
  return `
    <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #181d27;">
      <div style="text-align: center; padding: 32px 0 24px;">
        <h1 style="font-size: 20px; margin: 12px 0 0; color: #004659;">Regibee</h1>
      </div>
      <h2 style="font-size: 18px; text-align: center;">Reset your password</h2>
      <p style="color: #414651; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${opts.resetUrl}" style="background-color: #004659; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          Reset Password
        </a>
      </p>
      <p style="color:#888;font-size:13px;text-align:center;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;
}
