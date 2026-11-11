import { getMailer, sendEmail } from "./mailer";
import { supabaseAdmin } from "./supabase-admin";
import { formatEventDate, type EventDetails, type EventGuest, type GiftExchange } from "./events";
import { coHostInviteHtml, exchangeAssignmentHtml, registryLinkedHtml } from "./event-email-templates";
import { resolveRegistryLink } from "./events-server";

// Emails about co-hosts, linked registries and gift exchanges. The invitation
// and RSVP emails are in email.ts. Both send through mailer.ts, which uses
// Resend, or Mailpit in the end-to-end tests.

const FROM = "Regibee <notifications@regibee.com>";

// Resend's free testing sender can only deliver to the account email.
const TEST_RECIPIENT_OVERRIDE = process.env.RESEND_TEST_RECIPIENT;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function fromHost(hostName: string): string {
  const name = hostName.replace(/["<>\\\r\n]/g, "").trim().slice(0, 60);
  return name ? `"${name} via Regibee" <notifications@regibee.com>` : FROM;
}

async function nameOf(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data?.full_name as string | null)?.trim() || "Someone";
}

/**
 * Tells the managers of each registry that someone who doesn't manage it
 * linked it to their event. The person who linked it is left out.
 */
export async function notifyRegistryLinked(opts: {
  event: Pick<EventDetails, "id" | "slug" | "title"> & { event_date?: string | null };
  registryIds: string[];
  linkedBy: string;
}) {
  try {
    const [linkedByName, { data: event }] = await Promise.all([
      nameOf(opts.linkedBy),
      supabaseAdmin.from("events").select("event_date").eq("id", opts.event.id).maybeSingle(),
    ]);
    for (const registryId of opts.registryIds) {
      const [{ data: registry }, { data: managers }] = await Promise.all([
        supabaseAdmin.from("registries").select("id, title, owner_id").eq("id", registryId).maybeSingle(),
        supabaseAdmin.from("registry_managers").select("user_id").eq("registry_id", registryId),
      ]);
      if (!registry) continue;
      const userIds = [...new Set([registry.owner_id as string, ...(managers || []).map((m) => m.user_id as string)])].filter(
        (id) => id !== opts.linkedBy,
      );
      for (const userId of userIds) {
        const [{ data: user }, ownerName] = await Promise.all([
          supabaseAdmin.auth.admin.getUserById(userId),
          nameOf(userId),
        ]);
        const email = user?.user?.email;
        if (!email) continue;
        await sendEmail({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || email,
          subject: `${linkedByName} linked your registry to ${opts.event.title}`,
          html: registryLinkedHtml({
            ownerName: ownerName === "Someone" ? "there" : ownerName,
            linkedByName,
            registryTitle: registry.title,
            eventTitle: opts.event.title,
            eventDate: event?.event_date ? formatEventDate(event.event_date) : null,
            eventUrl: `${siteUrl()}/e/${opts.event.slug}`,
            registryDashboardUrl: `${siteUrl()}/dashboard/registry/${registry.id}`,
          }),
        });
      }
    }
  } catch (err) {
    console.error("[email] Failed to send registry linked email:", err);
  }
}

export async function sendCoHostInvite(opts: {
  toEmail: string;
  inviterName: string;
  eventTitle: string;
  token: string;
}) {
  try {
    await sendEmail({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.toEmail,
      subject: `${opts.inviterName} asked you to co-host ${opts.eventTitle}`,
      html: coHostInviteHtml({
        inviterName: opts.inviterName,
        eventTitle: opts.eventTitle,
        inviteUrl: `${siteUrl()}/host-invite/${opts.token}`,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send co-host invite:", err);
  }
}

// Resend takes up to 100 emails in one batch request.
const BATCH_SIZE = 100;

/** Emails each giver the person they drew. Replies go to the host. */
export async function sendExchangeAssignments(opts: {
  event: EventDetails;
  exchange: GiftExchange;
  hostName: string;
  replyTo: string | null;
  redraw: boolean;
  pairs: { giver: EventGuest & { email: string }; giftee: EventGuest }[];
}) {
  // A Regibee wishlist is looked up for its title and slug. Its link then goes
  // through the event's gift route with the giver's own token, the same way
  // the Secret Santa card on their RSVP page does. That route is what marks a
  // gift they reserve as from "Secret Santa", so a plain link would let the
  // wishlist's owner see their name.
  const wishlists = new Map<string, { title: string; slug: string } | null>();
  for (const { giftee } of opts.pairs) {
    if (giftee.wishlist_url && !wishlists.has(giftee.wishlist_url)) {
      const found = await resolveRegistryLink(giftee.wishlist_url);
      wishlists.set(giftee.wishlist_url, found ? { title: found.title, slug: found.slug } : null);
    }
  }
  const wishlistLink = (giver: EventGuest, wishlistUrl: string) => {
    const regibee = wishlists.get(wishlistUrl);
    if (!regibee) return { url: wishlistUrl, title: null };
    const url = `${siteUrl()}/e/${opts.event.slug}/gifts?g=${encodeURIComponent(giver.token)}&to=${encodeURIComponent(regibee.slug)}`;
    return { url, title: regibee.title };
  };

  const emails = opts.pairs.map(({ giver, giftee }) => ({
    from: fromHost(opts.hostName),
    to: TEST_RECIPIENT_OVERRIDE || giver.email,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    subject: opts.redraw
      ? `New Secret Santa name for ${opts.event.title}`
      : `Your Secret Santa name for ${opts.event.title}`,
    html: exchangeAssignmentHtml({
      giverName: giver.name,
      gifteeName: giftee.name,
      eventTitle: opts.event.title,
      hostName: opts.hostName,
      budget: opts.exchange.budget,
      eventDate: opts.event.event_date ? formatEventDate(opts.event.event_date) : null,
      mailed: opts.exchange.mailed,
      wishlist: giftee.wishlist_url ? wishlistLink(giver, giftee.wishlist_url) : null,
      giftIdeas: giftee.gift_ideas,
      shippingAddress: giftee.shipping_address,
      pageUrl: `${siteUrl()}/e/${opts.event.slug}?g=${encodeURIComponent(giver.token)}`,
      redraw: opts.redraw,
      giverIsHost: Boolean(opts.replyTo && giver.email.toLowerCase() === opts.replyTo.toLowerCase()),
    }),
  }));

  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    try {
      const { error } = await getMailer().sendBatch(emails.slice(start, start + BATCH_SIZE));
      if (error) console.error("[email] Failed to send Secret Santa names:", error);
    } catch (err) {
      console.error("[email] Failed to send Secret Santa names:", err);
    }
  }
}
