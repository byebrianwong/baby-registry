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

function registryStoreLine(parentName: string, storeName?: string): string {
  return storeName
    ? `<p>It's on ${escapeHtml(parentName)}'s ${escapeHtml(storeName)} registry, so buy it there and it counts toward the registry. ${escapeHtml(storeName)} has their address.</p>`
    : "";
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
  /** Set when the item is on the owners' own store registry, which has their address. */
  registryStoreName?: string;
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
    ${registryStoreLine(opts.parentName, opts.registryStoreName)}
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

/** Sent once, the day before a guest's reservation runs out. */
export function itemReservationReminderBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  parentName: string;
  registryTitle: string;
  /** Hours left, rounded. */
  hoursLeft: number;
  shippingAddress?: string;
  registryStoreName?: string;
  shopUrl?: string;
  storeName?: string;
  confirmUrl: string;
  releaseUrl: string;
}): string {
  const buyLabel = opts.storeName ? `Buy at ${opts.storeName}` : "Buy it";
  const hours = opts.hoursLeft === 1 ? "about an hour" : `about ${opts.hoursLeft} hours`;

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Your reservation of <strong>${escapeHtml(opts.itemTitle)}</strong> on <em>${escapeHtml(opts.registryTitle)}</em> ends in ${hours}. After that, it goes back on the list for other guests.</p>
    ${registryStoreLine(opts.parentName, opts.registryStoreName)}
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

/**
 * Sent when a guest says they sent the owners the money for an item the owners
 * bought themselves. The gift is saved as given at once, so the guest gets a
 * way to undo it.
 */
export function itemCoveredBuyerHtml(opts: {
  buyerName: string;
  itemTitle: string;
  quantity: number;
  /** Price times quantity. Null when the item has no price. */
  amount: number | null;
  parentName: string;
  registryTitle: string;
  registryUrl?: string;
  undoUrl?: string;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";
  const sent = opts.amount != null ? `<strong>${formatPrice(opts.amount)}</strong>` : "money";

  return `
    <p>Hi ${escapeHtml(opts.buyerName)},</p>
    <p>Thanks for sending ${sent} for <strong>${escapeHtml(opts.itemTitle)}</strong>${qtyText} on <em>${escapeHtml(opts.registryTitle)}</em>!</p>
    <p>${escapeHtml(opts.parentName)} will see it's from you, and will really appreciate it.</p>
    ${textLinks([
      { href: opts.registryUrl, label: "View Registry" },
      { href: opts.undoUrl, label: "Undo this gift" },
    ])}
    <p style="color:#888;font-size:13px;">Didn't send it after all? Undo the gift, and it goes back on the list. You're receiving this because you gave a gift on a Regibee registry.</p>
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

/** Sent to the owners and managers when a guest says they sent the money for an item the owners bought. */
export function itemCoveredOwnerHtml(opts: {
  ownerName: string;
  registryTitle: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  /** Price times quantity. Null when the item has no price. */
  amount: number | null;
  message?: string | null;
  dashboardLink: string;
}): string {
  const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";
  const sent = opts.amount != null ? `<strong>${formatPrice(opts.amount)}</strong>` : "money";

  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p><strong>${escapeHtml(opts.buyerName)}</strong> sent you ${sent} for <strong>${escapeHtml(opts.itemTitle)}</strong>${qtyText} on your registry <em>${escapeHtml(opts.registryTitle)}</em>.</p>
    <p>It went straight to you, so look for it in Venmo, PayPal or Zelle.</p>
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
  profileUrl: string;
  reviewUrl: string;
  settingsUrl: string;
}): string {
  const name = escapeHtml(opts.followerName);
  return `
    <p>Hi there,</p>
    <p><strong>${name}</strong> asked to follow you on Regibee.</p>
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

export function followInviteHtml(opts: {
  inviterName: string;
  inviteUrl: string;
}): string {
  const name = escapeHtml(opts.inviterName);
  const inviteUrl = escapeHtml(opts.inviteUrl);
  return `
    <p>Hi there,</p>
    <p><strong>${name}</strong> would like to follow you on Regibee, the gift registry for babies, birthdays and other occasions.</p>
    <p>If you say yes, they'll see the registries you choose to show on your Regibee profile. You can say yes with a free account, and remove them as a follower whenever you like.</p>
    <p style="margin: 24px 0;">
      <a href="${inviteUrl}" style="background-color: #004659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        See the invite
      </a>
    </p>
    <p style="color:#888;font-size:13px;">Or copy this link: ${inviteUrl}</p>
    <p style="color:#888;font-size:13px;">You're getting this because ${name} entered your email address on Regibee. If you don't know them, you can ignore this email. The invite expires in 30 days.</p>
  `;
}

// ── Events ───────────────────────────────────────────────────

/** What every event email says about the event. Built by eventEmailDetails in email.ts. */
export interface EventEmailDetails {
  title: string;
  hostedBy?: string | null;
  /** "Saturday, March 14, 2026" */
  date?: string | null;
  /** "2 – 5 PM PDT" */
  time?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  mapUrl?: string | null;
  imageUrl?: string | null;
  rsvpBy?: string | null;
  registry?: { title: string; url: string } | null;
}

const BUTTON_STYLE =
  "background-color:#004659;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;";

function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

function eventFactsBlock(event: EventEmailDetails): string {
  const rows: string[] = [];
  if (event.date) {
    rows.push(
      `<strong>When:</strong> ${escapeHtml(event.date)}${event.time ? `<br/>${escapeHtml(event.time)}` : ""}`,
    );
  }
  if (event.locationName || event.locationAddress) {
    const place = [event.locationName, event.locationAddress]
      .filter(Boolean)
      .map((part) => multiline(part!))
      .join("<br/>");
    const map = event.mapUrl
      ? `<br/><a href="${escapeHtml(event.mapUrl)}" style="color:#004659;">Map</a>`
      : "";
    rows.push(`<strong>Where:</strong> ${place}${map}`);
  }
  if (rows.length === 0) return "";
  return `<p style="background:#F0FAFC;border-radius:12px;padding:14px 16px;line-height:1.6;">${rows.join("<br/><br/>")}</p>`;
}

function registryLine(event: EventEmailDetails): string {
  if (!event.registry) return "";
  return `<p>Gift registry: <a href="${escapeHtml(event.registry.url)}" style="color:#004659;">${escapeHtml(event.registry.title)}</a></p>`;
}

/**
 * The invitation a host emails to a guest, and the reminder to guests who
 * haven't replied. The picture and the button both open the guest's own RSVP
 * link.
 */
export function eventInvitationHtml(opts: {
  guestName: string;
  /** Who's sending it: the host's name. */
  hostName: string;
  event: EventEmailDetails;
  /** The host's own words, shown as they wrote them. */
  message?: string | null;
  rsvpUrl: string;
  reminder?: boolean;
}): string {
  const { event } = opts;
  const image = event.imageUrl
    ? `<p style="margin:0 0 20px;"><a href="${escapeHtml(opts.rsvpUrl)}"><img src="${escapeHtml(event.imageUrl)}" alt="${escapeHtml(event.title)} invitation" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;" /></a></p>`
    : "";
  const intro = opts.reminder
    ? `<p>Just a reminder: <strong>${escapeHtml(opts.hostName)}</strong> would love to know if you can make it to <strong>${escapeHtml(event.title)}</strong>.</p>`
    : `<p><strong>${escapeHtml(opts.hostName)}</strong> invited you to <strong>${escapeHtml(event.title)}</strong>.</p>`;
  const hosted =
    event.hostedBy && event.hostedBy !== opts.hostName
      ? `<p style="color:#555;">Hosted by ${escapeHtml(event.hostedBy)}</p>`
      : "";
  const rsvpBy = event.rsvpBy
    ? `<p style="color:#555;font-size:13px;">Please reply by ${escapeHtml(event.rsvpBy)}.</p>`
    : "";

  return `
    <div style="max-width:560px;margin:0 auto;">
      ${image}
      <p>Hi ${escapeHtml(opts.guestName)},</p>
      ${intro}
      ${hosted}
      ${eventFactsBlock(event)}
      ${opts.message ? `<p>${multiline(opts.message)}</p>` : ""}
      <p style="margin:24px 0 8px;"><a href="${escapeHtml(opts.rsvpUrl)}" style="${BUTTON_STYLE}">RSVP</a></p>
      ${rsvpBy}
      ${registryLine(event)}
      <p style="color:#888;font-size:13px;">This link is just for you, so you can change your answer later. Or copy it: ${escapeHtml(opts.rsvpUrl)}</p>
      <p style="color:#888;font-size:13px;">You're getting this because ${escapeHtml(opts.hostName)} added you to the guest list for ${escapeHtml(event.title)} on Regibee. Reply to this email to reach them.</p>
    </div>
  `;
}

const RSVP_PHRASES: Record<"yes" | "no" | "maybe", string> = {
  yes: "You're going",
  maybe: "You might make it",
  no: "You can't make it",
};

/** Sent to a guest after they RSVP, when they gave an email address. */
export function rsvpGuestConfirmationHtml(opts: {
  guestName: string;
  status: "yes" | "no" | "maybe";
  partySize: number;
  event: EventEmailDetails;
  /** The guest's own link, to change the answer. */
  rsvpUrl: string;
  calendarUrl?: string | null;
}): string {
  const { event } = opts;
  const party =
    opts.status !== "no" && opts.partySize > 1 ? ` (${opts.partySize} people)` : "";
  const thanks =
    opts.status === "no"
      ? "Thanks for letting the host know."
      : opts.status === "maybe"
        ? "Thanks for letting the host know. If your plans firm up, change your answer anytime."
        : "Thanks for letting the host know. See you there!";
  const calendar =
    opts.status !== "no" && opts.calendarUrl
      ? `<p><a href="${escapeHtml(opts.calendarUrl)}" style="color:#004659;">Add to Google Calendar</a></p>`
      : "";

  return `
    <p>Hi ${escapeHtml(opts.guestName)},</p>
    <p><strong>${RSVP_PHRASES[opts.status]}${party}</strong> to <em>${escapeHtml(event.title)}</em>. ${thanks}</p>
    ${opts.status !== "no" ? eventFactsBlock(event) : ""}
    ${calendar}
    ${registryLine(event)}
    <p style="margin:16px 0;"><a href="${escapeHtml(opts.rsvpUrl)}" style="color:#004659;">See the invitation or change your RSVP</a></p>
    <p style="color:#888;font-size:13px;">You're getting this because you replied to an invitation on Regibee.</p>
  `;
}

/** Tells the host that a guest replied. */
export function rsvpHostNotificationHtml(opts: {
  hostName: string;
  guestName: string;
  status: "yes" | "no" | "maybe";
  partySize: number;
  note?: string | null;
  eventTitle: string;
  /** Counts after this reply. */
  attending: number;
  pending: number;
  manageUrl: string;
  /** True when the guest wasn't on the list and added themselves from the event link. */
  newGuest?: boolean;
}): string {
  const answer =
    opts.status === "yes"
      ? `is going${opts.partySize > 1 ? ` (${opts.partySize} people)` : ""}`
      : opts.status === "maybe"
        ? `might come${opts.partySize > 1 ? ` (${opts.partySize} people)` : ""}`
        : "can't make it";
  const pendingText = opts.pending === 1 ? "1 guest hasn't" : `${opts.pending} guests haven't`;

  return `
    <p>Hi ${escapeHtml(opts.hostName)},</p>
    <p><strong>${escapeHtml(opts.guestName)}</strong> ${answer} to <em>${escapeHtml(opts.eventTitle)}</em>.</p>
    ${opts.newGuest ? `<p style="color:#555;">They RSVPed from the event link, so they're now on your guest list.</p>` : ""}
    ${opts.note ? `<p>Their note: "${escapeHtml(opts.note)}"</p>` : ""}
    <p>So far, ${opts.attending === 1 ? "1 person is" : `${opts.attending} people are`} coming and ${pendingText} replied.</p>
    <p style="margin: 16px 0;"><a href="${escapeHtml(opts.manageUrl)}" style="color:#004659;">See your guest list</a></p>
    <p style="color:#888;font-size:13px;">You're getting this because you asked to hear about RSVPs. You can turn these emails off on the event's Edit page.</p>
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
