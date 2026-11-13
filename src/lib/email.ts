import { getMailer, sendEmail } from "./mailer";
import { supabaseAdmin } from "./supabase-admin";
import { formatPrice } from "./money";
import { SECRET_GIVER_NAME, hidesReservations } from "./gifts";
import { itemsHiddenFromOwner } from "./list-items";
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
  birthdayReminderHtml,
  birthdayReminderSubject,
  type BirthdayReminderEntry,
  completionDiscountOwnerHtml,
  eventInvitationHtml,
  rsvpGuestConfirmationHtml,
  rsvpHostNotificationHtml,
  guestMessageHtml,
  eventChangedHtml,
  dayBeforeReminderHtml,
  type EventEmailDetails,
} from "./email-templates";
import { displayName, profilePath } from "./profile-link";
import {
  eventLocationText,
  formatEventDate,
  formatEventTime,
  googleCalendarUrl,
  mapsUrl,
  type EventDetails,
  type GiftExchange,
  type LinkedRegistry,
} from "./events";
import { hidesAddressUntilSignup, withAddressFor } from "./signups";
import type { ChangedPart } from "./event-updates";

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
  /**
   * The email is about a gift: a reservation, a purchase or a pledge. An
   * owner who hides what's been reserved from themselves doesn't get these.
   * Co-managers still do.
   */
  giftNews?: boolean;
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
    .select("title, parent_names, honoree_names, owner_id, registry_type, event_type, settings")
    .eq("id", registryId)
    .single();

  if (!registry) return null;
  // An item can be on several of its owner's lists, and its gifts show on all
  // of them. If any of them hides what's been reserved, the owner isn't told.
  const skipOwner =
    Boolean(opts.giftNews) &&
    (hidesReservations(registry.settings) ||
      (opts.itemId
        ? (await itemsHiddenFromOwner([opts.itemId], registry.owner_id).catch(() => new Set<string>())).has(opts.itemId)
        : false));

  const parentNames =
    registry.honoree_names || registry.parent_names || "there";

  // Fetch all managers for this registry
  const { data: managers } = await supabaseAdmin
    .from("registry_managers")
    .select("user_id")
    .eq("registry_id", registryId);

  // Fall back to the registry owner if registry_managers has no rows
  const userIds = (managers && managers.length > 0
    ? managers.map((m) => m.user_id)
    : [registry.owner_id]
  ).filter((uid) => !(skipOwner && uid === registry.owner_id));

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
    await sendEmail({
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
    await sendEmail({
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
    await sendEmail({
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
    await sendEmail({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: itemGivenBuyerHtml(opts),
    });
  } catch (err) {
    console.error("[email] Failed to send buyer gift confirmation:", err);
  }
}

/** Thanks a guest for sending the money for an item the owners bought, with a link to undo it. */
export async function confirmItemCovered(
  opts: Parameters<typeof itemCoveredBuyerHtml>[0] & { buyerEmail: string }
) {
  try {
    await sendEmail({
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
    await sendEmail({
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
  /** A Secret Santa's gift: the owners see "Secret Santa", not the name. */
  hideGiver?: boolean;
  quantity: number;
  message?: string | null;
  /** Set when this gift may have unlocked a store's welcome box. */
  welcomeBox?: { storeName: string; boxName: string } | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ itemId: opts.itemId, giftNews: true });
    if (!managers) return;

    const buyerName = opts.hideGiver ? SECRET_GIVER_NAME : opts.buyerName;

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
        sendEmail({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `🎁 ${buyerName} bought "${opts.itemTitle}"`,
          html: itemGivenOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName,
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
        sendEmail({
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
  /** A Secret Santa's gift: the owners see "Secret Santa", not the name. */
  hideGiver?: boolean;
  amount: number;
  message?: string | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ fundId: opts.fundId, giftNews: true });
    if (!managers) return;

    const buyerName = opts.hideGiver ? SECRET_GIVER_NAME : opts.buyerName;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.fundId}`;
    const formatted = formatPrice(opts.amount);

    await Promise.all(
      managers.map((m) =>
        sendEmail({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `💵 ${buyerName} contributed ${formatted} to "${opts.fundTitle}"`,
          html: cashFundContributionOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName,
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

/** Tells the owners and managers that a guest sent them the money for an item they bought. */
export async function notifyItemCovered(opts: {
  itemId: string;
  itemTitle: string;
  buyerName: string;
  /** A Secret Santa's gift: the owners see "Secret Santa", not the name. */
  hideGiver?: boolean;
  quantity: number;
  /** Price times quantity. Null when the item has no price. */
  amount: number | null;
  message?: string | null;
}) {
  try {
    const managers = await getRegistryManagerEmails({ itemId: opts.itemId, giftNews: true });
    if (!managers) return;

    const buyerName = opts.hideGiver ? SECRET_GIVER_NAME : opts.buyerName;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.itemId}`;
    const sent = opts.amount != null ? formatPrice(opts.amount) : "money";

    await Promise.all(
      managers.map((m) =>
        sendEmail({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `🎉 ${buyerName} sent you ${sent} for "${opts.itemTitle}"`,
          html: itemCoveredOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName,
            itemTitle: opts.itemTitle,
            quantity: opts.quantity,
            amount: opts.amount,
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

    await sendEmail({
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
        sendEmail({
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

    await sendEmail({
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

    await sendEmail({
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

// ── Birthdays ────────────────────────────────────────────────

/**
 * The daily birthday reminder (src/lib/birthdays-server.ts). The caller logs
 * it first, and checks the reader's opt-out. False when it couldn't be sent,
 * so the caller can let a later run try again.
 */
export async function sendBirthdayReminder(opts: {
  toEmail: string;
  toName: string | null;
  days: number;
  birthdays: BirthdayReminderEntry[];
  settingsUrl: string;
}): Promise<boolean> {
  try {
    await sendEmail({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.toEmail,
      subject: birthdayReminderSubject(
        opts.birthdays.map((b) => ({ name: b.name.slice(0, 60) })),
        opts.days,
      ),
      html: birthdayReminderHtml(opts),
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send a birthday reminder:", err);
    return false;
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

/**
 * What the event emails say about an event. Pass the event as the reader may
 * see it: a meal train's address only goes to people who signed up
 * (withAddressFor in signups.ts).
 */
export function eventEmailDetails(
  event: EventDetails,
  registries: LinkedRegistry[],
  exchange: Pick<GiftExchange, "budget" | "draw_by" | "mailed" | "drawn_at"> | null = null,
  signupTitle: string | null = null,
): EventEmailDetails {
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
    registries: registries.map((r) => ({ title: r.title, url: `${siteUrl()}/r/${r.slug}` })),
    giftNote: event.gift_note,
    exchange: exchange
      ? {
          budget: exchange.budget,
          drawBy: exchange.draw_by ? formatEventDate(exchange.draw_by) : null,
          mailed: exchange.mailed,
        }
      : null,
    signup: signupTitle
      ? { title: signupTitle, mealTrain: hidesAddressUntilSignup(event.event_type) }
      : null,
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
  registries: LinkedRegistry[];
  exchange?: GiftExchange | null;
  /** The sign-up sheet's title, when the event has one. */
  signupTitle?: string | null;
  hostName: string;
  replyTo: string | null;
  guests: { name: string; email: string; token: string }[];
  reminder?: boolean;
}): Promise<{ sentTokens: string[]; error: string | null }> {
  // Nobody has signed up from an invitation yet, so a meal train's address stays out.
  const details = eventEmailDetails(
    withAddressFor(opts.event, false),
    opts.registries,
    opts.exchange,
    opts.signupTitle ?? null,
  );
  const subject = opts.reminder
    ? `Reminder: will you be at ${opts.event.title}?`
    : `You're invited: ${opts.event.title}`;
  const sentTokens: string[] = [];

  for (let start = 0; start < opts.guests.length; start += BATCH_SIZE) {
    const chunk = opts.guests.slice(start, start + BATCH_SIZE);
    try {
      const { error } = await getMailer().sendBatch(
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
  registries: LinkedRegistry[];
  exchange?: GiftExchange | null;
  /** Whether the guest is in the gift exchange after this RSVP. */
  inExchange?: boolean;
  guest: { name: string; email: string; token: string };
  status: "yes" | "no" | "maybe";
  partySize: number;
  /** The event's sign-up sheet and what this guest signed up for, as "Side (Mac and cheese)". */
  signups?: { title: string; claims: string[] } | null;
  /** The guest's answers to the RSVP questions. */
  answers?: { label: string; value: string }[];
}) {
  try {
    // A meal train's address goes only to people who signed up for a day.
    const event = withAddressFor(opts.event, (opts.signups?.claims.length ?? 0) > 0);
    const eventUrl = `${siteUrl()}/e/${opts.event.slug}`;
    const subject = hidesAddressUntilSignup(opts.event.event_type)
      ? opts.status === "no"
        ? `Your reply for ${opts.event.title}`
        : `You're signed up: ${opts.event.title}`
      : opts.status === "yes"
        ? `You're going to ${opts.event.title}`
        : `Your RSVP for ${opts.event.title}`;
    await sendEmail({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.guest.email,
      subject,
      html: rsvpGuestConfirmationHtml({
        guestName: opts.guest.name,
        status: opts.status,
        partySize: opts.partySize,
        event: eventEmailDetails(event, opts.registries, opts.exchange, opts.signups?.title ?? null),
        rsvpUrl: guestRsvpUrl(opts.event.slug, opts.guest.token),
        calendarUrl: googleCalendarUrl(event, eventUrl),
        inExchange: opts.inExchange,
        signups: opts.signups?.claims ?? [],
        answers: opts.answers,
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
  /** What the guest signed up for, as "Side (Mac and cheese)". */
  signups?: string[];
  /** The guest's answers to the RSVP questions. */
  answers?: { label: string; value: string }[];
}) {
  try {
    const [{ data: userData }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(opts.event.owner_id),
      supabaseAdmin.from("profiles").select("full_name").eq("id", opts.event.owner_id).single(),
    ]);
    const email = userData?.user?.email;
    if (!email) return;

    const answer = hidesAddressUntilSignup(opts.event.event_type)
      ? opts.status === "no"
        ? "can't help this time with"
        : "signed up to help with"
      : opts.status === "yes"
        ? "is going to"
        : opts.status === "maybe"
          ? "might come to"
          : "can't make it to";
    await sendEmail({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || email,
      subject: `${opts.guestName} ${answer} ${opts.event.title}`,
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
        signups: opts.signups ?? [],
        mealTrain: hidesAddressUntilSignup(opts.event.event_type),
        answers: opts.answers,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send RSVP notification:", err);
  }
}

// ── Updates to guests (#100) ─────────────────────────────────

type GuestEmail = { to: string; subject: string; html: string };

/**
 * Sends one email per guest, in batches, from the host's name. Returns how
 * many Resend accepted, and an error to show when a batch failed.
 */
async function sendGuestEmails(
  emails: GuestEmail[],
  opts: { hostName: string; replyTo: string | null },
): Promise<{ sent: number; error: string | null }> {
  let sent = 0;
  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    const chunk = emails.slice(start, start + BATCH_SIZE);
    try {
      const { error } = await getMailer().sendBatch(
        chunk.map((email) => ({
          from: fromHost(opts.hostName),
          to: TEST_RECIPIENT_OVERRIDE || email.to,
          ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
          subject: email.subject,
          html: email.html,
        })),
      );
      if (error) {
        console.error("[email] Failed to send to guests:", error);
        return { sent, error: "Some emails didn't send. Try again in a few minutes." };
      }
      sent += chunk.length;
    } catch (err) {
      console.error("[email] Failed to send to guests:", err);
      return { sent, error: "Some emails didn't send. Try again in a few minutes." };
    }
  }
  return { sent, error: null };
}

/** A message the host wrote, to the guests they chose. */
export async function sendGuestMessage(opts: {
  event: EventDetails;
  hostName: string;
  replyTo: string | null;
  subject: string;
  body: string;
  guests: { name: string; email: string; token: string }[];
}): Promise<{ sent: number; error: string | null }> {
  return sendGuestEmails(
    opts.guests.map((guest) => ({
      to: guest.email,
      subject: opts.subject,
      html: guestMessageHtml({
        guestName: guest.name,
        hostName: opts.hostName,
        eventTitle: opts.event.title,
        body: opts.body,
        rsvpUrl: guestRsvpUrl(opts.event.slug, guest.token),
      }),
    })),
    opts,
  );
}

const PART_LABELS: Record<ChangedPart, string> = { date: "Date", time: "Time", place: "Place" };

function describePart(event: EventDetails, part: ChangedPart): string {
  if (part === "date") return event.event_date ? formatEventDate(event.event_date) : "No date";
  if (part === "time") return formatEventTime(event) ?? "No time";
  return eventLocationText(event) || "No place";
}

/**
 * Tells guests the date, time or place changed. A meal train's address goes
 * only to guests who signed up for a day (withAddressFor in signups.ts), so a
 * place change on a meal train reaches only them.
 */
export async function sendEventChangeEmails(opts: {
  before: EventDetails;
  after: EventDetails;
  parts: ChangedPart[];
  registries: LinkedRegistry[];
  hostName: string;
  replyTo: string | null;
  guests: { name: string; email: string; token: string; signedUp: boolean }[];
}): Promise<{ sent: number; error: string | null }> {
  const what = opts.parts.map((p) => PART_LABELS[p].toLowerCase());
  const subject = `New ${what.length === 1 ? what[0] : `${what.slice(0, -1).join(", ")} and ${what[what.length - 1]}`}: ${opts.after.title}`;
  const siteEventUrl = `${siteUrl()}/e/${opts.after.slug}`;
  const emails: GuestEmail[] = [];
  for (const guest of opts.guests) {
    const before = withAddressFor(opts.before, guest.signedUp);
    const after = withAddressFor(opts.after, guest.signedUp);
    // Only the parts this guest can see: a meal train's place is for helpers.
    const parts = opts.parts.filter(
      (part) => part !== "place" || guest.signedUp || !hidesAddressUntilSignup(opts.after.event_type),
    );
    if (parts.length === 0) continue;
    emails.push({
      to: guest.email,
      subject,
      html: eventChangedHtml({
        guestName: guest.name,
        hostName: opts.hostName,
        event: eventEmailDetails(after, opts.registries),
        changes: parts.map((part) => ({
          label: PART_LABELS[part],
          before: describePart(before, part),
          after: describePart(after, part),
        })),
        rsvpUrl: guestRsvpUrl(opts.after.slug, guest.token),
        calendarUrl: parts.includes("date") || parts.includes("time") ? googleCalendarUrl(after, siteEventUrl) : null,
      }),
    });
  }
  return sendGuestEmails(emails, opts);
}

/** The day before the event, to everyone going. Returns how many were sent. */
export async function sendDayBeforeReminders(opts: {
  event: EventDetails;
  registries: LinkedRegistry[];
  hostName: string;
  /** Where guests' replies go: the host's own address. */
  replyTo: string | null;
  guests: { name: string; email: string; token: string; signups: string[] }[];
}): Promise<number> {
  const eventUrl = `${siteUrl()}/e/${opts.event.slug}`;
  const { sent } = await sendGuestEmails(
    opts.guests.map((guest) => {
      const event = withAddressFor(opts.event, guest.signups.length > 0);
      return {
        to: guest.email,
        subject: `Tomorrow: ${opts.event.title}`,
        html: dayBeforeReminderHtml({
          guestName: guest.name,
          hostName: opts.hostName,
          event: eventEmailDetails(event, opts.registries),
          rsvpUrl: guestRsvpUrl(opts.event.slug, guest.token),
          calendarUrl: googleCalendarUrl(event, eventUrl),
          signups: guest.signups,
        }),
      };
    }),
    { hostName: opts.hostName, replyTo: opts.replyTo },
  );
  return sent;
}
