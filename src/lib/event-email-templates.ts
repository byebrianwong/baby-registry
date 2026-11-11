/**
 * HTML for the emails about co-hosts, linked registries and gift exchanges.
 * Pure functions, like src/lib/email-templates.ts: event-email.ts sends them
 * and Storybook previews them. Every value is escaped, because guests and
 * hosts type names, wishlists and addresses.
 */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

const BUTTON_STYLE =
  "background-color:#004659;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;";

const BOX_STYLE = "background:#F0FAFC;border-radius:12px;padding:14px 16px;line-height:1.6;";

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 8px;"><a href="${escapeHtml(href)}" style="${BUTTON_STYLE}">${escapeHtml(label)}</a></p>`;
}

/** Tells a registry's owners that someone linked it to their event. */
export function registryLinkedHtml(opts: {
  ownerName: string;
  linkedByName: string;
  registryTitle: string;
  eventTitle: string;
  eventDate?: string | null;
  eventUrl: string;
  registryDashboardUrl: string;
}): string {
  const when = opts.eventDate ? ` on ${escapeHtml(opts.eventDate)}` : "";
  return `
    <p>Hi ${escapeHtml(opts.ownerName)},</p>
    <p><strong>${escapeHtml(opts.linkedByName)}</strong> linked your registry <em>${escapeHtml(opts.registryTitle)}</em> to <strong>${escapeHtml(opts.eventTitle)}</strong>${when}.</p>
    <p>Guests see your registry on the invitation, so they know what to bring. ${escapeHtml(opts.linkedByName)} can't change your registry or see who gave what.</p>
    ${button(opts.eventUrl, "See the invitation")}
    <p style="color:#555;font-size:14px;">Didn't expect this? You can unlink your registry from <a href="${escapeHtml(opts.registryDashboardUrl)}" style="color:#004659;">your registry's page</a>.</p>
    <p style="color:#888;font-size:13px;">You're getting this because you manage this registry on Regibee.</p>
  `;
}

/** Invites someone to co-host an event. */
export function coHostInviteHtml(opts: { inviterName: string; eventTitle: string; inviteUrl: string }): string {
  return `
    <p>Hi,</p>
    <p><strong>${escapeHtml(opts.inviterName)}</strong> asked you to co-host <strong>${escapeHtml(opts.eventTitle)}</strong> on Regibee.</p>
    <p>Co-hosts can edit the event, add guests, send invitations and reminders, see RSVPs and draw names.</p>
    ${button(opts.inviteUrl, "Co-host this event")}
    <p style="color:#888;font-size:13px;">Or copy this link: ${escapeHtml(opts.inviteUrl)}</p>
    <p style="color:#888;font-size:13px;">The invitation expires in 14 days. If you don't know ${escapeHtml(opts.inviterName)}, you can ignore this email.</p>
  `;
}

/** Tells one person in a gift exchange whose name they drew. */
export function exchangeAssignmentHtml(opts: {
  giverName: string;
  gifteeName: string;
  eventTitle: string;
  hostName: string;
  budget?: string | null;
  /** "Saturday, December 19, 2026" */
  eventDate?: string | null;
  mailed: boolean;
  wishlist?: { url: string; title?: string | null } | null;
  giftIdeas?: string | null;
  shippingAddress?: string | null;
  /** The giver's own link: it shows their person and their own wishlist. */
  pageUrl: string;
  /** Names were drawn a second time, so this replaces an earlier email. */
  redraw?: boolean;
  /** The giver is the host, taking part too. */
  giverIsHost?: boolean;
}): string {
  const facts: string[] = [];
  if (opts.budget) facts.push(`<strong>Budget:</strong> ${escapeHtml(opts.budget)}`);
  if (opts.eventDate) {
    facts.push(`<strong>${opts.mailed ? "Mail it in time for" : "Bring it on"}:</strong> ${escapeHtml(opts.eventDate)}`);
  }
  if (opts.wishlist) {
    facts.push(
      `<strong>Their wishlist:</strong> <a href="${escapeHtml(opts.wishlist.url)}" style="color:#004659;">${escapeHtml(opts.wishlist.title || opts.wishlist.url)}</a>`,
    );
  }
  if (opts.giftIdeas) facts.push(`<strong>Their gift ideas:</strong><br/>${multiline(opts.giftIdeas)}`);
  if (opts.mailed && opts.shippingAddress) {
    facts.push(`<strong>Mail it to:</strong><br/>${multiline(opts.shippingAddress)}`);
  }
  const none =
    !opts.wishlist && !opts.giftIdeas
      ? `<p>${escapeHtml(opts.gifteeName)} hasn't added a wishlist or gift ideas yet. Your link below shows them as soon as they do.</p>`
      : "";

  return `
    <div style="max-width:560px;margin:0 auto;">
      <p>Hi ${escapeHtml(opts.giverName)},</p>
      ${
        opts.redraw
          ? `<p>${escapeHtml(opts.hostName)} drew names again for <strong>${escapeHtml(opts.eventTitle)}</strong>, so this replaces the name you got before.</p>`
          : `<p>Names were drawn for <strong>${escapeHtml(opts.eventTitle)}</strong>.</p>`
      }
      <p style="font-size:20px;margin:20px 0;">You're getting a gift for <strong>${escapeHtml(opts.gifteeName)}</strong>.</p>
      ${facts.length > 0 ? `<p style="${BOX_STYLE}">${facts.join("<br/><br/>")}</p>` : ""}
      ${none}
      <p>Keep it a secret! Nobody else knows who drew whom${opts.giverIsHost ? "" : `, not even ${escapeHtml(opts.hostName)}`}.</p>
      ${button(opts.pageUrl, "See your Secret Santa page")}
      <p style="color:#888;font-size:13px;">This link is just for you. It always shows your person's latest wishlist${opts.mailed ? " and address" : ""}.</p>
    </div>
  `;
}
