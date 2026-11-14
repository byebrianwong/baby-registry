"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { EventGroupGifts } from "@/components/event-group-gifts";
import { EventInvitation, type InvitationRegistry } from "@/components/event-invitation";
import { GuestWishLists } from "@/components/guest-wish-lists";
import { RsvpForm } from "@/components/rsvp-form";
import { SecretSantaCard } from "@/components/secret-santa-card";
import type { RsvpInput } from "@/lib/actions/events";
import { addDays } from "@/lib/demo-data";
import { findDemoEvent, type DemoEvent } from "@/lib/demo-events";
import { DEMO_GROUP_GIFTS, demoEventGroupGift } from "@/lib/demo-group-gifts";
import { demoRegistryPath, findDemoRegistry, type DemoRegistry } from "@/lib/demo-registries";
import {
  eventHasPassed,
  exchangeKind,
  googleCalendarUrl,
  type EventGuest,
  type ExchangeGiftee,
  type GuestWishList,
} from "@/lib/events";
import { storedAnswers } from "@/lib/rsvp-questions";
import { hidesAddressUntilSignup, signupRowsForGuest, withAddressFor, type SignupClaim } from "@/lib/signups";
import { useDemoToday } from "../demo-today";
import { DemoGuestShell } from "./demo-shell";
import { DemoGuestHeader } from "./demo-guest-header";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** How many gifts the invitation previews from each registry, like src/lib/events-server.ts. */
const PREVIEW_ITEMS = 4;

/** Someone who RSVPs on the plain event link, without a personal one. */
const VISITOR_ID = "demo-visitor";

/** A registry as the invitation shows it: a few gifts still needed, with pictures first. */
function invitationRegistry(registry: DemoRegistry): InvitationRegistry {
  const open = registry.items
    .filter((i) => i.quantity_fulfilled < i.quantity_needed)
    .sort((a, b) => Number(b.is_essential) - Number(a.is_essential));
  return {
    title: registry.title,
    slug: registry.slug,
    honoree: registry.honoree_names,
    itemsLeft: open.length,
    items: [...open]
      .sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
      .slice(0, PREVIEW_ITEMS)
      .map((i) => ({ id: i.id, title: i.title, image_url: i.image_url, price: i.price })),
  };
}

/** A guest's wish list, when it's one of the demo's registries. */
function demoList(today: string, guest: Pick<EventGuest, "wishlist_registry_id">): DemoRegistry | null {
  return guest.wishlist_registry_id ? findDemoRegistry(today, { id: guest.wishlist_registry_id }) : null;
}

/** Everyone's wish lists, like getGuestWishLists in src/lib/events-server.ts. */
function guestWishLists(today: string, guests: EventGuest[], viewerId: string | null): GuestWishList[] {
  return guests
    .filter((g) => g.in_exchange)
    .map((g) => {
      const list = demoList(today, g);
      return {
        guestId: g.id,
        name: g.name,
        isYou: g.id === viewerId,
        url: g.wishlist_url,
        registry: list ? { title: list.title, slug: list.slug } : null,
        giftIdeas: g.gift_ideas,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => Number(b.isYou) - Number(a.isYou));
}

/**
 * A demo event as guests see it. Like src/app/e/[slug]/page.tsx: `token` is
 * the guest's own RSVP link (?g=), which greets them by name, shows who they
 * drew in a Secret Santa, and marks their own wish list. Without one, anyone
 * can RSVP when the event allows it.
 */
export function DemoPublicEvent({ slug, token }: { slug: string; token: string | null }) {
  const today = useDemoToday();
  const event = findDemoEvent(today, { slug });
  if (!event) notFound();
  // A new link starts the page over.
  return <GuestPage key={`${event.id}:${token ?? ""}`} event={event} token={token} today={today} />;
}

function GuestPage({ event, token, today }: { event: DemoEvent; token: string | null; today: string }) {
  // RSVPs change these, so the wish lists, sign-ups and a meal train's
  // address update the way the real page does after it reloads.
  const [guests, setGuests] = useState(event.guests);
  const [claims, setClaims] = useState<SignupClaim[]>(event.signup?.claims ?? []);
  const [visitorAnswered, setVisitorAnswered] = useState(false);

  const guest = token ? (guests.find((g) => g.token === token) ?? null) : null;
  const viewerId = guest?.id ?? (visitorAnswered ? VISITOR_ID : null);
  const registry = event.registryId ? findDemoRegistry(today, { id: event.registryId }) : null;
  const exchange = event.exchange;
  const everyone = exchangeKind(exchange) === "everyone";

  // Sign-up days count as over only once yesterday is past them, like the real page.
  const yesterday = addDays(today, -1);
  const sheet = event.signup ? { ...event.signup, claims } : null;
  const signupRows = sheet ? signupRowsForGuest(sheet, viewerId, yesterday) : [];
  // A meal train's drop-off address shows only to guests who signed up for a day.
  const signedUp = signupRows.some((row) => row.mine);
  const shown = withAddressFor(event, signedUp);
  const addressHidden = shown !== event && Boolean(event.location_name || event.location_address);
  const mealTrain = hidesAddressUntilSignup(event.event_type);
  const google = googleCalendarUrl(shown, `${SITE_URL}/demo/e/${event.slug}`);

  // Group gifts started from this event, on a guest's own link only, like the
  // real page. None of the demo's guests manage the lists they're for.
  const groupGifts = guest
    ? DEMO_GROUP_GIFTS.filter((g) => g.eventId === event.id).flatMap((g) => {
        const list = findDemoRegistry(today, { id: g.registryId });
        return list ? [demoEventGroupGift(g, list)] : [];
      })
    : [];

  // Who this guest drew, once names are drawn. Only their own link shows it.
  const drew = exchange?.drawn_at && guest?.giftee_id ? guests.find((g) => g.id === guest.giftee_id) : null;
  const gifteeList = drew ? demoList(today, drew) : null;
  const giftee: ExchangeGiftee | null = drew
    ? {
        name: drew.name,
        wishlistUrl: drew.wishlist_url,
        wishlistTitle: gifteeList?.title ?? null,
        giftIdeas: drew.gift_ideas,
        shippingAddress: exchange?.mailed ? drew.shipping_address : null,
      }
    : null;

  const submit = async (input: RsvpInput) => {
    const id = guest?.id ?? VISITOR_ID;
    const attending = input.status !== "no";
    const choice = input.exchange;
    // A pasted link to one of the demo's lists counts as that list.
    const pastedSlug = choice?.wishlistUrl?.match(/\/r\/([a-z0-9-]+)/i)?.[1];
    const pastedList = pastedSlug ? findDemoRegistry(today, { slug: pastedSlug }) : null;
    const changes: Partial<EventGuest> = {
      rsvp_status: input.status,
      party_size: attending ? input.partySize : 0,
      kids_count: input.kidsCount ?? 0,
      rsvp_note: input.note?.trim() || null,
      responded_at: new Date().toISOString(),
      answers: storedAnswers(input.answers),
      ...(choice && {
        in_exchange: choice.join,
        wishlist_url: choice.wishlistUrl?.trim() || null,
        wishlist_registry_id: pastedList?.id ?? null,
        gift_ideas: choice.giftIdeas?.trim() || null,
        shipping_address: choice.shippingAddress?.trim() || null,
      }),
    };
    if (guest) {
      setGuests((current) => current.map((g) => (g.id === id ? { ...g, ...changes } : g)));
    } else {
      const visitor: EventGuest = {
        id: VISITOR_ID,
        event_id: event.id,
        name: input.name?.trim() || "You",
        email: input.email?.trim() || null,
        token: VISITOR_ID,
        rsvp_status: input.status,
        party_size: 1,
        kids_count: 0,
        rsvp_note: null,
        responded_at: null,
        invited_at: null,
        reminded_at: null,
        added_by_guest: true,
        in_exchange: false,
        wishlist_url: null,
        gift_ideas: null,
        shipping_address: null,
        giftee_id: null,
        created_at: new Date().toISOString(),
      };
      setGuests((current) => [...current.filter((g) => g.id !== VISITOR_ID), { ...visitor, ...changes }]);
      setVisitorAnswered(true);
    }
    if (input.signups) {
      const stamp = new Date().toISOString();
      const picked = input.signups.map((s) => ({ item_id: s.itemId, guest_id: id, note: s.note?.trim() || null, created_at: stamp }));
      setClaims((current) => [...current.filter((c) => c.guest_id !== id), ...picked]);
    }
    // Saved nowhere. Without a token back, the form stays on this page.
    return { error: null };
  };

  return (
    <DemoGuestShell>
      <DemoGuestHeader />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <EventInvitation
          event={shown}
          registries={registry ? [invitationRegistry(registry)] : []}
          exchange={exchange}
          calendar={google ? { google, ics: `/demo/e/${event.slug}/calendar` } : null}
          signup={sheet ? { title: sheet.sheet.title, note: sheet.sheet.note, rows: signupRows, mealTrain } : null}
          addressHidden={addressHidden}
          basePath="/demo"
        >
          {giftee && exchange && (
            <SecretSantaCard
              giftee={giftee}
              budget={exchange.budget}
              mailed={exchange.mailed}
              wishlistHref={gifteeList ? demoRegistryPath(gifteeList) : drew?.wishlist_url ?? null}
            />
          )}
          {/* Guests see everyone's lists. So do the hosts, which on the plain link is you, Remi & Max. */}
          {everyone && (
            <GuestWishLists
              lists={guestWishLists(today, guests, guest?.id ?? null)}
              waitingCount={guests.filter((g) => g.rsvp_status === "pending").length}
              hostView={!guest}
              basePath="/demo"
            />
          )}
          {token && !guest && (
            <p className="rounded-xl bg-sunshine-50 p-4 text-sm text-sunshine-900">
              This RSVP link isn&apos;t on the guest list anymore. Ask the host for a new one.
            </p>
          )}
          <RsvpForm
            slug={event.slug}
            token={guest?.token ?? null}
            guest={
              guest
                ? {
                    name: guest.name,
                    status: guest.rsvp_status,
                    partySize: guest.party_size,
                    kidsCount: guest.kids_count,
                    note: guest.rsvp_note,
                    inExchange: guest.in_exchange,
                    wishlistUrl: guest.wishlist_url,
                    giftIdeas: guest.gift_ideas,
                    shippingAddress: guest.shipping_address,
                    answers: storedAnswers(guest.answers),
                  }
                : null
            }
            openRsvp={event.open_rsvp && !(exchange?.drawn_at && exchange.mailed)}
            maxPartySize={event.max_party_size}
            askKids={event.ask_kids}
            exchange={
              exchange ? { kind: exchangeKind(exchange), mailed: exchange.mailed, drawn: Boolean(exchange.drawn_at) } : null
            }
            passed={eventHasPassed(event, yesterday)}
            signup={sheet ? { title: sheet.sheet.title, rows: signupRows } : null}
            mealTrain={mealTrain}
            questions={event.rsvp_questions}
            submitAction={submit}
          />
          <EventGroupGifts gifts={groupGifts} basePath="/demo" />
        </EventInvitation>
      </main>
    </DemoGuestShell>
  );
}
