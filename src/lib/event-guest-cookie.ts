import crypto from "crypto";
import { cookies } from "next/headers";

// When a guest follows a gift link on their invitation, this cookie tells the
// registry page who they are: their name and email for the gift form, and
// which event guest to record on the gift. For a gift exchange it also says
// whose Secret Santa they are, so a gift they reserve on that person's list
// hides their name from the list's owner.
//
// The route that sets it (src/app/e/[slug]/gifts/route.ts) checks the guest's
// RSVP token first. The cookie is signed, so a browser can't change it to
// claim another guest, and httpOnly, so page scripts can't read the email.

export const EVENT_GUEST_COOKIE = "regibee_event_guest";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

export interface EventGuestContext {
  eventId: string;
  guestId: string;
  name: string;
  email: string | null;
  /** Set when the guest is someone's Secret Santa and that person's wishlist is a Regibee registry. */
  santa?: { registryId: string; gifteeName: string } | null;
}

function secret(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to sign the event guest cookie");
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(`event-guest:${payload}`).digest("base64url");
}

export function encodeEventGuest(context: EventGuestContext): string {
  const payload = Buffer.from(JSON.stringify(context)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeEventGuest(raw: string | undefined): EventGuestContext | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.eventId !== "string" || typeof data?.guestId !== "string" || typeof data?.name !== "string") {
      return null;
    }
    return data as EventGuestContext;
  } catch {
    return null;
  }
}

export const EVENT_GUEST_COOKIE_OPTIONS = {
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/** The guest context for this request, if the browser has a valid cookie. Server only. */
export async function readEventGuestCookie(): Promise<EventGuestContext | null> {
  const store = await cookies();
  return decodeEventGuest(store.get(EVENT_GUEST_COOKIE)?.value);
}
