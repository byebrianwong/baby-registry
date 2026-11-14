"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/require-account";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getEventForManager, getEventGuests } from "@/lib/events-server";
import { sendGuestMessage } from "@/lib/email";
import {
  MAX_MESSAGES_PER_DAY,
  MAX_MESSAGE_BODY_LENGTH,
  MAX_MESSAGE_SUBJECT_LENGTH,
  isMessageAudience,
  messageRecipients,
  type MessageAudience,
} from "@/lib/event-updates";

// "Message guests" on an event (#100): the host writes to everyone going, or
// a wider group, by email. Replies go to the host. The message also shows on
// the invitation for anyone with its link (#129), so guests the host texted
// the link to see it. With nobody to email, it's only posted there.

type Result<T = object> = ({ error: null } & T) | { error: string };

export async function sendEventMessage(
  eventId: string,
  input: { audience: MessageAudience; subject: string; body: string },
): Promise<Result<{ sent: number }>> {
  const { user, error: authError } = await requireAccount();
  if (authError || !user) return { error: authError ?? "You need an account to do this." };
  const found = await getEventForManager(eventId, user.id);
  if (!found) return { error: "That event wasn't found, or you can't manage it." };
  const { event } = found;

  if (!isMessageAudience(input.audience)) return { error: "Choose who gets it." };
  const subject = input.subject.trim().slice(0, MAX_MESSAGE_SUBJECT_LENGTH);
  const body = input.body.trim().slice(0, MAX_MESSAGE_BODY_LENGTH);
  if (!subject) return { error: "Add a subject." };
  if (!body) return { error: "Write your message." };

  // A host can write a few times a day, so a message can't turn into a flood.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("event_messages")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("kind", "message")
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_MESSAGES_PER_DAY) {
    return { error: `You can send up to ${MAX_MESSAGES_PER_DAY} messages a day to this event's guests. Try again tomorrow.` };
  }

  const recipients = messageRecipients(await getEventGuests(eventId), input.audience);

  let sent = 0;
  let error: string | null = null;
  if (recipients.length > 0) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).single();
    const hostName = event.hosted_by || profile?.full_name?.trim() || "Your host";
    ({ sent, error } = await sendGuestMessage({
      event,
      hostName,
      replyTo: user.email ?? null,
      subject,
      body,
      guests: recipients,
    }));
    // Nothing went out, so the host tries again rather than posting it twice.
    if (sent === 0) return { error: error ?? "Your message wasn't sent. Try again." };
  }

  const { error: saveError } = await supabaseAdmin.from("event_messages").insert({
    event_id: eventId,
    sent_by: user.id,
    kind: "message",
    audience: input.audience,
    subject,
    body,
    recipients: sent,
  });
  if (saveError) {
    console.error("[event-messages] Failed to save a message:", saveError);
    // Emailed but not posted: say so, without inviting a second send.
    if (sent > 0) return { error: `Emailed to ${sent}, but it couldn't be posted on the invitation.` };
    return { error: "Your message wasn't posted. Try again." };
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/e/${event.slug}`);
  if (error) return { error: `${error} ${sent} sent.` };
  return { error: null, sent };
}
