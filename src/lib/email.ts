import { Resend } from "resend";
import { supabaseAdmin } from "./supabase-admin";
import { formatPrice } from "./money";
import {
  itemReservedBuyerHtml,
  itemReservationReminderBuyerHtml,
  itemReservationEndedBuyerHtml,
  itemGivenBuyerHtml,
  itemCoveredBuyerHtml,
  cashFundContributionBuyerHtml,
  itemGivenOwnerHtml,
  itemCoveredOwnerHtml,
  cashFundContributionOwnerHtml,
  newSuggestionOwnerHtml,
  managerInviteHtml,
  followRequestHtml,
  followInviteHtml,
  completionDiscountOwnerHtml,
  eventInvitationHtml,
  rsvpGuestConfirmationHtml,
  rsvpHostNotificationHtml,
  type EventEmailDetails,
} from "./email-templates";
import { displayName, profilePath } from "./profile-link";
import {
  formatEventDate,
  formatEventTime,
  googleCalendarUrl,
  mapsUrl,
  type EventDetails,
  type LinkedRegistry,
} from "./events";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = "Regibee <notifications@regibee.com>";

// Resend's free testing sender can only deliver to the account email.
// Set this env var to override the recipient for testing.
const TEST_RECIPIENT_OVERRIDE = process.env.RESEND_TEST_RECIPIENT;

interface ManagerEmailInfo {
  email: string;
  name: string;
  registryTitle: string;
  registryId: string;
  parentNames: string;
}

async function getRegistryManagerEmails(opts: {
  itemId?: string;
  fundId?: string;
  registryId?: string;
}): Promise<ManagerEmailInfo[] | null> {
  let registryId = opts.registryId;

  if (opts.itemId) {
    const { data } = await supabaseAdmin
      .from("registry_items")
      .select("registry_id")
      .eq("id", opts.itemId)
      .single();
    registryId = data?.registry_id;
  } else if (opts.fundId) {
    const { data } = await supabaseAdmin
      .from("cash_funds")
      .select("registry_id")
      .eq("id", opts.fundId)
      .single();
    registryId = data?.registry_id;
  }

  if (!registryId) return null;

  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("title, parent_names, honoree_names, owner_id, registry_type, event_type")
    .eq("id", registryId)
    .single();

  if (!registry) return null;

  const parentNames =
    registry.honoree_names || registry.parent_names || "there";

  // Fetch all managers for this registry
  const { data: managers } = await supabaseAdmin
    .from("registry_managers")
    .select("user_id")
    .eq("registry_id", registryId);

  // Fall back to the registry owner if registry_managers has no rows
  const userIds = managers && managers.length > 0
    ? managers.map((m) => m.user_id)
    : [registry.owner_id];

  // Look up each manager's email and name
  const results: ManagerEmailInfo[] = [];
  for (const uid of userIds) {
    const [{ data: userData }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(uid),
      supabaseAdmin.from("profiles").select("full_name").eq("id", uid).single(),
    ]);
    if (userData?.user?.email) {
      results.push({
        email: userData.user.email,
        name: profile?.full_name || parentNames,
        registryTitle: registry.title,
        registryId,
        parentNames,
      });
    }
  }

  return results.length > 0 ? results : null;
}

interface PaymentMethods {
  venmo?: string;
  paypal?: string;
  zelle?: string;
}

async function getRegistryInfoForBuyer(opts: {
  itemId?: string;
  fundId?: string;
}): Promise<{ parentName: string; registryTitle: string; shippingAddress?: string; paymentMethods?: PaymentMethods; slug: string } | null> {
  let registryId: string | undefined;

  if (opts.itemId) {
    const { data } = await supabaseAdmin
      .from("registry_items")
      .select("registry_id")
      .eq("id", opts.itemId)
      .single();
    registryId = data?.registry_id;
  } else if (opts.fundId) {
    const { data } = await supabaseAdmin
      .from("cash_funds")
      .select("registry_id")
      .eq("id", opts.fundId)
      .single();
    registryId = data?.registry_id;
  }

  if (!registryId) return null;

  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("title, parent_names, honoree_names, settings, slug")
    .eq("id", registryId)
    .single();

  if (!registry) return null;

  const settings = registry.settings as Record<string, unknown> | null;
  const shippingAddress = (settings?.shipping_address as string) || undefined;
  const pm = settings?.payment_methods as PaymentMethods | undefined;
  const paymentMethods = pm && (pm.venmo || pm.paypal || pm.zelle) ? pm : undefined;

  return {
    parentName:
      registry.honoree_names ||
      registry.parent_names ||
      "The Registry Owner",
    registryTitle: registry.title,
    shippingAddress,
    paymentMethods,
    slug: registry.slug,
  };
}

type ReservationEmailOpts = Parameters<typeof itemReservedBuyerHtml>[0] & { buyerEmail: string };

/** Tells a guest their reservation is held, with the address and links to finish. */
export async function confirmItemReserved(opts: ReservationEmailOpts) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `You reserved "${opts.itemTitle}". It's held for ${opts.holdDays} days`,
      html: itemReservedBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send buyer item reserved email:", err);
  }
}

/** Reminds a guest that their reservation runs out soon. */
export async function remindItemReservation(
  opts: Parameters<typeof itemReservationReminderBuyerHtml>[0] & { buyerEmail: string }
) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your reservation of "${opts.itemTitle}" ends soon`,
      html: itemReservationReminderBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send reservation reminder:", err);
  }
}

/** Tells a guest their reservation ran out and the item went back on the list. */
export async function notifyItemReservationEnded(
  opts: Parameters<typeof itemReservationEndedBuyerHtml>[0] & { buyerEmail: string }
) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your reservation of "${opts.itemTitle}" ended`,
      html: itemReservationEndedBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send reservation ended email:", err);
  }
}

/** Thanks a guest once they say they bought the item. */
export async function confirmItemGiven(
  opts: Parameters<typeof itemGivenBuyerHtml>[0] & { buyerEmail: string }
) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: itemGivenBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send buyer gift confirmation:", err);
  }
}

export async function confirmItemCovered(opts: {
  buyerEmail: string;
  buyerName: string;
  itemTitle: string;
  parentName: string;
  registryTitle: string;
  paymentMethods?: { venmo?: string; paypal?: string; zelle?: string };
  registryUrl?: string;
  shopUrl?: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: itemCoveredBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send buyer item covered confirmation:", err);
  }
}

export async function confirmCashFundContribution(opts: {
  buyerEmail: string;
  buyerName: string;
  fundTitle: string;
  amount: number;
  parentName: string;
  registryTitle: string;
  paymentMethods?: { venmo?: string; paypal?: string; zelle?: string };
  registryUrl?: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your contribution is confirmed — "${opts.fundTitle}"`,
      html: cashFundContributionBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send buyer cash fund confirmation:", err);
  }
}

export { getRegistryInfoForBuyer };

/** Tells the owners and managers that a guest bought an item. */
export async function notifyItemGiven(opts: {
  itemId: string;
  itemTitle: string;
  buyerName: string;
  quantity: number;
  message?: string | null;
  /** Set when this gift may have unlocked a store's welcome box. */
  welcomeBox?: { storeName: string; boxName: string } | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ itemId: opts.itemId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.itemId}`;
    const welcomeBox = opts.welcomeBox
      ? {
          ...opts.welcomeBox,
          perksLink: `${siteUrl}/dashboard/registry/${managers[0].registryId}?tab=perks`,
        }
      : null;

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `🎁 ${opts.buyerName} bought "${opts.itemTitle}"`,
          html: itemGivenOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName: opts.buyerName,
            itemTitle: opts.itemTitle,
            quantity: opts.quantity,
            message: opts.message,
            dashboardLink,
            welcomeBox,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[email] Failed to send item given notification:", err);
  }
}

/** Tells a registry's managers that store completion discounts may have opened. */
export async function notifyCompletionDiscounts(opts: {
  registryId: string;
  stores: { name: string; amount: string }[];
}) {
  try {
    const managers = await getRegistryManagerEmails({ registryId: opts.registryId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const perksLink = `${siteUrl}/dashboard/registry/${opts.registryId}?tab=perks`;
    const subject =
      opts.stores.length === 1
        ? `Your ${opts.stores[0].name} completion discount may be open`
        : "Your store completion discounts may be open";

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject,
          html: completionDiscountOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            stores: opts.stores,
            perksLink,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[email] Failed to send completion discount reminder:", err);
  }
}

export async function notifyCashFundContribution(opts: {
  fundId: string;
  fundTitle: string;
  buyerName: string;
  amount: number;
  message?: string | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ fundId: opts.fundId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.fundId}`;
    const formatted = formatPrice(opts.amount);

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `💵 ${opts.buyerName} contributed ${formatted} to "${opts.fundTitle}"`,
          html: cashFundContributionOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName: opts.buyerName,
            fundTitle: opts.fundTitle,
            amount: opts.amount,
            message: opts.message,
            dashboardLink,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[email] Failed to send cash fund notification:", err);
  }
}

export async function notifyItemCovered(opts: {
  itemId: string;
  itemTitle: string;
  buyerName: string;
  message?: string | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ itemId: opts.itemId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.itemId}`;

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `🎉 ${opts.buyerName} is covering "${opts.itemTitle}"`,
          html: itemCoveredOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName: opts.buyerName,
            itemTitle: opts.itemTitle,
            message: opts.message,
            dashboardLink,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[email] Failed to send item covered notification:", err);
  }
}

export async function sendManagerInvite(opts: {
  toEmail: string;
  inviterName: string;
  registryTitle: string;
  token: string;
}) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${siteUrl}/invite/${opts.token}`;

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.toEmail,
      subject: `${opts.inviterName} invited you to manage "${opts.registryTitle}"`,
      html: managerInviteHtml({
        inviterName: opts.inviterName,
        registryTitle: opts.registryTitle,
        inviteUrl,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send manager invite:", err);
  }
}

export async function notifyNewSuggestion(opts: {
  registryId: string;
  title: string;
  suggestedByName: string;
  price?: number | null;
  notes?: string | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ registryId: opts.registryId });
    if (!managers) return;

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `💡 ${opts.suggestedByName} suggested "${opts.title}"`,
          html: newSuggestionOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            suggestedByName: opts.suggestedByName,
            title: opts.title,
            price: opts.price,
            notes: opts.notes,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[email] Failed to send suggestion notification:", err);
  }
}

const FOLLOW_REQUEST_EMAIL_GAP_MS = 24 * 60 * 60 * 1000;

// Tells someone a person asked to follow them. Sends at most one email per
// follower per day, so withdrawing and asking again can't flood anyone.
export async function notifyFollowRequest(opts: { followerId: string; followeeId: string }) {
  try {
    const [{ data: followee }, { data: follower }, { data: lastEmail }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("email_follow_requests")
        .eq("id", opts.followeeId)
        .single(),
      supabaseAdmin.from("profiles").select("public_id, full_name").eq("id", opts.followerId).single(),
      supabaseAdmin
        .from("follow_request_emails")
        .select("sent_at")
        .eq("follower_id", opts.followerId)
        .eq("followee_id", opts.followeeId)
        .maybeSingle(),
    ]);

    if (!followee?.email_follow_requests || !follower) return;
    if (lastEmail && Date.now() - new Date(lastEmail.sent_at).getTime() < FOLLOW_REQUEST_EMAIL_GAP_MS) {
      return;
    }

    const {
      data: { user },
    } = await supabaseAdmin.auth.admin.getUserById(opts.followeeId);
    if (!user?.email) return;

    // Record it before sending, so two requests at once can't both send.
    await supabaseAdmin
      .from("follow_request_emails")
      .upsert(
        { follower_id: opts.followerId, followee_id: opts.followeeId, sent_at: new Date().toISOString() },
        { onConflict: "follower_id,followee_id" },
      );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const followerName = displayName(follower).slice(0, 60);

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || user.email,
      subject: `${followerName} wants to follow you on Regibee`,
      html: followRequestHtml({
        followerName,
        profileUrl: `${siteUrl}${profilePath(follower)}`,
        reviewUrl: `${siteUrl}/dashboard/account#follows`,
        settingsUrl: `${siteUrl}/dashboard/account`,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send follow request email:", err);
  }
}

// An invite to follow someone who may not have an account yet. The caller
// (sendFollowInvite) checks the sending limits and opt-outs first.
export async function sendFollowInviteEmail(opts: { toEmail: string; inviterName: string; token: string }) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviterName = opts.inviterName.slice(0, 60);

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.toEmail,
      subject: `${inviterName} wants to follow you on Regibee`,
      html: followInviteHtml({
        inviterName,
        inviteUrl: `${siteUrl}/follow-invite/${opts.token}`,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send follow invite:", err);
  }
}

// ── Events ───────────────────────────────────────────────────

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/** A guest's own link to the event page, which lets them RSVP as themselves. */
export function guestRsvpUrl(slug: string, token: string): string {
  return `${siteUrl()}/e/${slug}?g=${encodeURIComponent(token)}`;
}

/** What the event emails say about an event. */
export function eventEmailDetails(event: EventDetails, registry: LinkedRegistry | null): EventEmailDetails {
  return {
    title: event.title,
    hostedBy: event.hosted_by,
    date: event.event_date ? formatEventDate(event.event_date) : null,
    time: formatEventTime(event),
    locationName: event.location_name,
    locationAddress: event.location_address,
    mapUrl: mapsUrl(event),
    imageUrl: event.image_url,
    rsvpBy: event.rsvp_by ? formatEventDate(event.rsvp_by) : null,
    registry: registry ? { title: registry.title, url: `${siteUrl()}/r/${registry.slug}` } : null,
  };
}

// The From line shows the host's name, so guests know who the invitation is
// from. Quotes and angle brackets would break the address, so they go.
function fromHost(hostName: string): string {
  const name = hostName.replace(/["<>\\\r\n]/g, "").trim().slice(0, 60);
  return name ? `"${name} via Regibee" <notifications@regibee.com>` : FROM;
}

// Resend takes up to 100 emails in one batch request.
const BATCH_SIZE = 100;

/**
 * Emails invitations (or reminders) to guests, in batches. Returns the tokens
 * of the guests whose emails Resend accepted, so the caller marks only those
 * as invited. Replies go to the host's own address.
 */
export async function sendEventInvitations(opts: {
  event: EventDetails;
  registry: LinkedRegistry | null;
  hostName: string;
  replyTo: string | null;
  guests: { name: string; email: string; token: string }[];
  reminder?: boolean;
}): Promise<{ sentTokens: string[]; error: string | null }> {
  const details = eventEmailDetails(opts.event, opts.registry);
  const subject = opts.reminder
    ? `Reminder: will you be at ${opts.event.title}?`
    : `You're invited: ${opts.event.title}`;
  const sentTokens: string[] = [];

  for (let start = 0; start < opts.guests.length; start += BATCH_SIZE) {
    const chunk = opts.guests.slice(start, start + BATCH_SIZE);
    try {
      const { error } = await getResend().batch.send(
        chunk.map((guest) => ({
          from: fromHost(opts.hostName),
          to: TEST_RECIPIENT_OVERRIDE || guest.email,
          ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
          subject,
          html: eventInvitationHtml({
            guestName: guest.name,
            hostName: opts.hostName,
            event: details,
            message: opts.event.message,
            rsvpUrl: guestRsvpUrl(opts.event.slug, guest.token),
            reminder: opts.reminder,
          }),
        })),
      );
      if (error) {
        console.error("[email] Failed to send event invitations:", error);
        return { sentTokens, error: "Some emails didn't send. Try again in a few minutes." };
      }
      sentTokens.push(...chunk.map((guest) => guest.token));
    } catch (err) {
      console.error("[email] Failed to send event invitations:", err);
      return { sentTokens, error: "Some emails didn't send. Try again in a few minutes." };
    }
  }

  return { sentTokens, error: null };
}

/** Confirms a guest's RSVP, with their link to change it. */
export async function confirmRsvpToGuest(opts: {
  event: EventDetails;
  registry: LinkedRegistry | null;
  guest: { name: string; email: string; token: string };
  status: "yes" | "no" | "maybe";
  partySize: number;
}) {
  try {
    const eventUrl = `${siteUrl()}/e/${opts.event.slug}`;
    const subject =
      opts.status === "yes"
        ? `You're going to ${opts.event.title}`
        : `Your RSVP for ${opts.event.title}`;
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.guest.email,
      subject,
      html: rsvpGuestConfirmationHtml({
        guestName: opts.guest.name,
        status: opts.status,
        partySize: opts.partySize,
        event: eventEmailDetails(opts.event, opts.registry),
        rsvpUrl: guestRsvpUrl(opts.event.slug, opts.guest.token),
        calendarUrl: googleCalendarUrl(opts.event, eventUrl),
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send RSVP confirmation:", err);
  }
}

/** Tells the event's owner that a guest replied. */
export async function notifyHostOfRsvp(opts: {
  event: EventDetails;
  guestName: string;
  status: "yes" | "no" | "maybe";
  partySize: number;
  note: string | null;
  attending: number;
  pending: number;
  newGuest: boolean;
}) {
  try {
    const [{ data: userData }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(opts.event.owner_id),
      supabaseAdmin.from("profiles").select("full_name").eq("id", opts.event.owner_id).single(),
    ]);
    const email = userData?.user?.email;
    if (!email) return;

    const answer = opts.status === "yes" ? "is going" : opts.status === "maybe" ? "might come" : "can't make it";
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || email,
      subject: `${opts.guestName} ${answer} to ${opts.event.title}`,
      html: rsvpHostNotificationHtml({
        hostName: profile?.full_name?.trim() || "there",
        guestName: opts.guestName,
        status: opts.status,
        partySize: opts.partySize,
        note: opts.note,
        eventTitle: opts.event.title,
        attending: opts.attending,
        pending: opts.pending,
        manageUrl: `${siteUrl()}/dashboard/events/${opts.event.id}`,
        newGuest: opts.newGuest,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send RSVP notification:", err);
  }
}
