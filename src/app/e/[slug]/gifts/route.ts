import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { registrySlugFromLink, resolveRegistryLink } from "@/lib/events-server";
import { EVENT_GUEST_COOKIE, EVENT_GUEST_COOKIE_OPTIONS, encodeEventGuest } from "@/lib/event-guest-cookie";

// A gift link on a guest's invitation: /e/<event>/gifts?g=<rsvp token>&to=<registry slug>.
// It remembers who the guest is (see src/lib/event-guest-cookie.ts) and sends
// them on to the registry, so the gift form knows their name and the gift is
// matched to their RSVP. For a gift exchange, "to" can be the wishlist of the
// person the guest drew, and the cookie marks them as that person's Secret
// Santa.
//
// The registry's own address ends up in the address bar, so a guest who
// copies it and sends it on doesn't send their identity along.

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("g") ?? "";
  const to = registrySlugFromLink(request.nextUrl.searchParams.get("to") ?? "");
  const eventUrl = new URL(`/e/${slug}`, request.url);
  if (!to) return NextResponse.redirect(eventUrl);

  const registryUrl = new URL(`/r/${to}`, request.url);
  const { data: event } = await supabaseAdmin.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event || !token) return NextResponse.redirect(registryUrl);

  const [{ data: guest }, registry] = await Promise.all([
    supabaseAdmin
      .from("event_guests")
      .select("id, name, email, giftee_id")
      .eq("event_id", event.id)
      .eq("token", token)
      .maybeSingle(),
    resolveRegistryLink(to),
  ]);
  if (!guest || !registry) return NextResponse.redirect(registryUrl);

  // The guest's Secret Santa person, when their wishlist is this registry.
  let santa: { registryId: string; gifteeName: string } | null = null;
  if (guest.giftee_id) {
    const { data: giftee } = await supabaseAdmin
      .from("event_guests")
      .select("name, wishlist_url")
      .eq("id", guest.giftee_id)
      .eq("event_id", event.id)
      .maybeSingle();
    if (giftee?.wishlist_url && registrySlugFromLink(giftee.wishlist_url) === registry.slug) {
      santa = { registryId: registry.id, gifteeName: giftee.name };
    }
  }

  // Otherwise the registry must be one the event links.
  if (!santa) {
    const { data: link } = await supabaseAdmin
      .from("event_registries")
      .select("registry_id")
      .eq("event_id", event.id)
      .eq("registry_id", registry.id)
      .maybeSingle();
    if (!link) return NextResponse.redirect(registryUrl);
  }

  const response = NextResponse.redirect(registryUrl);
  response.cookies.set(
    EVENT_GUEST_COOKIE,
    encodeEventGuest({ eventId: event.id, guestId: guest.id, name: guest.name, email: guest.email, santa }),
    EVENT_GUEST_COOKIE_OPTIONS,
  );
  return response;
}
