/**
 * Pure HTML template functions for all Regibee emails.
 * Used by email.ts for sending and by Storybook for visual preview.
 */

function formatPaymentBlock(paymentMethods?: { venmo?: string; paypal?: string; zelle?: string }): string {
  if (!paymentMethods || (!paymentMethods.venmo && !paymentMethods.paypal && !paymentMethods.zelle)) {
    return "";
  }
  const lines = [];
  if (paymentMethods.venmo) lines.push(`Venmo: ${paymentMethods.venmo}`);
  if (paymentMethods.paypal) lines.push(`PayPal: ${paymentMethods.paypal}`);
  if (paymentMethods.zelle) lines.push(`Zelle: ${paymentMethods.zelle}`);
  return `<p style="color:#999;font-size:13px;">If not sent yet, send payment via:<br/>${lines.join("<br/>")}</p>`;
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ── Buyer Confirmations ──────────────────────────────────────

export function itemReservedBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  quantity: number;
  parentName: string;
  registryTitle: string;
  shippingAddress?: string;
  registryUrl?: string;
  shopUrl?: string;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";
  const addressBlock = opts.shippingAddress
    ? `<p><strong>Shipping address:</strong><br/>${opts.shippingAddress.replace(/\n/g, "<br/>")}</p>`
    : "";
  const linksBlock = [
    opts.registryUrl ? `<a href="${opts.registryUrl}" style="color:#004659;">View Registry</a>` : "",
    opts.shopUrl ? `<a href="${opts.shopUrl}" style="color:#004659;">Shop This Item</a>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  return `
    <p>Hi ${opts.buyerName},</p>
    <p>Thanks for reserving <strong>${opts.itemTitle}</strong>${qtyText} on <em>${opts.registryTitle}</em>!</p>
    <p>${opts.parentName} will really appreciate it.</p>
    ${addressBlock}
    ${linksBlock ? `<p style="margin: 16px 0;">${linksBlock}</p>` : ""}
    <p style="color:#888;font-size:13px;">You're receiving this because you reserved a gift on a Regibee registry.</p>
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
    opts.registryUrl ? `<a href="${opts.registryUrl}" style="color:#004659;">View Registry</a>` : "",
    opts.shopUrl ? `<a href="${opts.shopUrl}" style="color:#004659;">Shop This Item</a>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  return `
    <p>Hi ${opts.buyerName},</p>
    <p>Thanks for gifting <strong>${opts.itemTitle}</strong> on <em>${opts.registryTitle}</em>!</p>
    <p>${opts.parentName} will really appreciate it.</p>
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
  const formatted = formatUSD(opts.amount);
  const paymentBlock = formatPaymentBlock(opts.paymentMethods);
  const linkBlock = opts.registryUrl
    ? `<p style="margin: 16px 0;"><a href="${opts.registryUrl}" style="color:#004659;">View Registry</a></p>`
    : "";

  return `
    <p>Hi ${opts.buyerName},</p>
    <p>Thanks for contributing <strong>${formatted}</strong> to <strong>${opts.fundTitle}</strong> on <em>${opts.registryTitle}</em>!</p>
    <p>${opts.parentName} will really appreciate it.</p>
    ${paymentBlock}
    ${linkBlock}
    <p style="color:#888;font-size:13px;">You're receiving this because you contributed to a cash fund on a Regibee registry.</p>
  `;
}

// ── Owner Notifications ──────────────────────────────────────

export function itemReservedOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  message?: string | null;
  dashboardLink: string;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";

  return `
    <p>Hi ${opts.ownerName},</p>
    <p><strong>${opts.buyerName}</strong> just reserved <strong>${opts.itemTitle}</strong>${qtyText} on your registry <em>${opts.registryTitle}</em>.</p>
    ${opts.message ? `<p>Their message: "${opts.message}"</p>` : ""}
    <p style="margin: 16px 0;"><a href="${opts.dashboardLink}" style="color:#004659;">View on Dashboard</a></p>
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
    <p>Hi ${opts.ownerName},</p>
    <p><strong>${opts.buyerName}</strong> offered to cover the cost of <strong>${opts.itemTitle}</strong> on your registry <em>${opts.registryTitle}</em>.</p>
    ${opts.message ? `<p>Their message: "${opts.message}"</p>` : ""}
    <p style="margin: 16px 0;"><a href="${opts.dashboardLink}" style="color:#004659;">View on Dashboard</a></p>
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
  const formatted = formatUSD(opts.amount);

  return `
    <p>Hi ${opts.ownerName},</p>
    <p><strong>${opts.buyerName}</strong> contributed <strong>${formatted}</strong> to your cash fund <strong>${opts.fundTitle}</strong> on <em>${opts.registryTitle}</em>.</p>
    ${opts.message ? `<p>Their message: "${opts.message}"</p>` : ""}
    <p style="margin: 16px 0;"><a href="${opts.dashboardLink}" style="color:#004659;">View on Dashboard</a></p>
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
  const priceText = opts.price ? ` (${formatUSD(opts.price)})` : "";

  return `
    <p>Hi ${opts.ownerName},</p>
    <p><strong>${opts.suggestedByName}</strong> suggested adding <strong>${opts.title}</strong>${priceText} to your registry <em>${opts.registryTitle}</em>.</p>
    ${opts.notes ? `<p>Their note: "${opts.notes}"</p>` : ""}
    <p>Head to your dashboard to accept or decline this suggestion.</p>
    <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your registry.</p>
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
    <p><strong>${opts.inviterName}</strong> invited you to help manage the registry <strong>${opts.registryTitle}</strong>.</p>
    <p>As a manager, you'll be able to add and edit items, view gift activity, and help organize the registry.</p>
    <p style="margin: 24px 0;">
      <a href="${opts.inviteUrl}" style="background-color: #004659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color:#888;font-size:13px;">Or copy this link: ${opts.inviteUrl}</p>
    <p style="color:#888;font-size:13px;">This invite expires in 7 days.</p>
  `;
}

// ── Supabase Auth Templates ──────────────────────────────────
// These are proposed branded templates to replace the Supabase defaults.
// In the Supabase dashboard, use {{ .ConfirmationURL }} for confirmUrl
// and {{ .SiteURL }} for siteUrl.

export function supabaseDefaultConfirmSignupHtml(opts: {
  confirmUrl: string;
}): string {
  return `
    <h2>Confirm your signup</h2>
    <p>Follow this link to confirm your user:</p>
    <p><a href="${opts.confirmUrl}">Confirm your mail</a></p>
  `;
}

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

export function supabaseDefaultResetPasswordHtml(opts: {
  resetUrl: string;
}): string {
  return `
    <h2>Reset Password</h2>
    <p>Follow this link to reset the password for your user:</p>
    <p><a href="${opts.resetUrl}">Reset Password</a></p>
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
