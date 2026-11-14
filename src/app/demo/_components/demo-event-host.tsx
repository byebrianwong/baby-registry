"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Gift, ImagePlus, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EventCoHosts, type CoHostActions } from "@/components/event-co-hosts";
import { EventGuestManager, type GuestManagerActions } from "@/components/event-guest-manager";
import { ExchangeManager, type ExchangeActions } from "@/components/exchange-manager";
import { GuestMessages } from "@/components/guest-messages";
import { PlanAgainButton } from "@/components/plan-again-button";
import { SignupSheetManager, SignupSheetStarter, type SignupActions } from "@/components/signup-sheet-manager";
import { DeleteEventButton } from "@/app/(protected)/dashboard/events/[eventId]/delete-event-button";
import { addDays } from "@/lib/demo-data";
import { DEMO_ME_ID, demoEvents, findDemoEvent, isDemoHost, type DemoEvent } from "@/lib/demo-events";
import { DEMO_ME } from "@/lib/demo-people";
import { demoRegistryPath, findDemoRegistry } from "@/lib/demo-registries";
import { MESSAGE_AUDIENCES, messageRecipients, type EventMessage, type MessageAudience } from "@/lib/event-updates";
import {
  eventTheme,
  eventTypeLabel,
  exchangeKind,
  exchangeStatus,
  formatEventDate,
  formatEventTime,
  guestForHost,
  isEmail,
  MIN_EXCHANGE_PARTICIPANTS,
  type EventGuest,
  type GiftExchange,
} from "@/lib/events";
import { drawNames, orderedPair, type Pair } from "@/lib/gift-exchange";
import {
  claimsByGuest,
  describeClaim,
  hidesAddressUntilSignup,
  signupRowsForHost,
  SIGNUP_PRESETS,
  type SignupItem,
  type SignupSheetWithRows,
} from "@/lib/signups";
import { cx } from "@/lib/utils/cx";
import { useDemoToday } from "../demo-today";
import { DemoOwnerShell } from "./demo-shell";

export const DEMO_NOT_SAVED = "This is a demo, so nothing is saved. Sign up free to plan your own.";

const DAY = 24 * 60 * 60 * 1000;
const ok = { error: null };
const now = () => new Date().toISOString();
/** Ids for rows made in the demo. */
const newId = (prefix: string, i = 0) => `${prefix}-${Date.now()}-${i}`;

type SetGuests = React.Dispatch<React.SetStateAction<EventGuest[]>>;

/**
 * The guest list's server actions, done to a list in this page's state
 * instead. They behave like the real ones (src/lib/actions/events.ts), so
 * adding, inviting, reminding and changing RSVPs all show on the page.
 */
function guestActions(guests: EventGuest[], setGuests: SetGuests, today: string): GuestManagerActions {
  const add = (eventId: string, list: { name: string; email: string | null }[]) => {
    const known = new Set(guests.map((g) => g.email).filter(Boolean));
    const fresh = list.filter((g) => !g.email || !known.has(g.email.toLowerCase()));
    setGuests((current) => [
      ...current,
      ...fresh.map((g, i) => ({
        id: newId("guest", i),
        event_id: eventId,
        name: g.name,
        email: g.email?.toLowerCase() ?? null,
        token: newId("demo-new", i),
        rsvp_status: "pending" as const,
        party_size: 1,
        rsvp_note: null,
        kids_count: 0,
        in_exchange: false,
        wishlist_url: null,
        gift_ideas: null,
        shipping_address: null,
        giftee_id: null,
        responded_at: null,
        invited_at: null,
        reminded_at: null,
        added_by_guest: false,
        created_at: now(),
      })),
    ]);
    return { ...ok, added: fresh.length, alreadyListed: list.length - fresh.length };
  };

  return {
    addGuests: async (eventId, list) => add(eventId, list),
    sendInvites: async (_eventId, guestIds) => {
      const sendTo = guests.filter((g) =>
        guestIds ? guestIds.includes(g.id) && g.email : g.email && !g.invited_at && g.rsvp_status === "pending",
      );
      const ids = new Set(sendTo.map((g) => g.id));
      setGuests((current) => current.map((g) => (ids.has(g.id) ? { ...g, invited_at: now() } : g)));
      return { ...ok, sent: sendTo.length };
    },
    sendReminders: async () => {
      const due = guests.filter(
        (g) =>
          g.email &&
          g.invited_at &&
          g.rsvp_status === "pending" &&
          (!g.reminded_at || Date.now() - Date.parse(g.reminded_at) >= DAY),
      );
      const ids = new Set(due.map((g) => g.id));
      setGuests((current) => current.map((g) => (ids.has(g.id) ? { ...g, reminded_at: now() } : g)));
      return { ...ok, sent: due.length };
    },
    setRsvp: async (_eventId, guestId, status, partySize) => {
      setGuests((current) =>
        current.map((g) =>
          g.id === guestId
            ? {
                ...g,
                rsvp_status: status,
                party_size: status === "no" ? 0 : Math.max(partySize, 1),
                responded_at: status === "pending" ? null : now(),
              }
            : g,
        ),
      );
      return ok;
    },
    updateGuest: async (_eventId, guestId, changes) => {
      setGuests((current) =>
        current.map((g) =>
          g.id === guestId ? { ...g, name: changes.name.trim(), email: changes.email?.toLowerCase() ?? null } : g,
        ),
      );
      return ok;
    },
    removeGuest: async (_eventId, guestId) => {
      setGuests((current) => current.filter((g) => g.id !== guestId));
      return ok;
    },
    // Copies the names and emails from another demo event, like the real one.
    copyGuests: async (eventId, sourceEventId) => {
      const source = findDemoEvent(today, { id: sourceEventId });
      if (!source) return { error: "That event isn't in the demo.", added: 0, alreadyListed: 0 };
      return add(
        eventId,
        source.guests.filter((g) => g.name !== DEMO_ME.full_name).map((g) => ({ name: g.name, email: g.email })),
      );
    },
    // The demo has no groups to invite, and doesn't save new ones.
    inviteGroup: async () => ({ ...ok, added: 0, alreadyListed: 0 }),
    saveAsGroup: async () => ({ error: "Groups aren't saved in the demo. Sign up to keep this guest list." }),
  };
}

/** The gift exchange's actions, done to this page's state. Like src/lib/actions/events.ts. */
function exchangeActions(
  guests: EventGuest[],
  setGuests: SetGuests,
  exclusions: DemoEvent["exclusions"],
  setExclusions: React.Dispatch<React.SetStateAction<DemoEvent["exclusions"]>>,
  setExchange: React.Dispatch<React.SetStateAction<GiftExchange | null>>,
): ExchangeActions {
  const same = (a: string, b: string) => (p: { guest_a: string; guest_b: string }) => {
    const [x, y] = orderedPair(a, b);
    return p.guest_a === x && p.guest_b === y;
  };
  return {
    setParticipant: async (_eventId, guestId, inExchange) => {
      setGuests((current) => current.map((g) => (g.id === guestId ? { ...g, in_exchange: inExchange } : g)));
      return ok;
    },
    addExclusion: async (_eventId, a, b) => {
      if (a === b) return { error: "Choose two different people." };
      if (exclusions.some(same(a, b))) return { error: "Those two already won't draw each other." };
      const [x, y] = orderedPair(a, b);
      setExclusions((current) => [...current, { guest_a: x, guest_b: y }]);
      return ok;
    },
    removeExclusion: async (_eventId, a, b) => {
      setExclusions((current) => current.filter((p) => !same(a, b)(p)));
      return ok;
    },
    draw: async (_eventId, options) => {
      const people = guests.filter((g) => g.in_exchange);
      // Drawing again steers away from the pairs it's replacing.
      const previous: Pair[] = options?.again
        ? people.filter((g) => g.giftee_id).map((g) => [g.id, g.giftee_id as string] as const)
        : [];
      const result = drawNames({
        people: people.map((g) => g.id),
        exclusions: exclusions.map((p) => [p.guest_a, p.guest_b] as const),
        previous,
      });
      if (!result.ok) {
        return {
          error:
            result.reason === "too_few"
              ? `A gift exchange needs at least ${MIN_EXCHANGE_PARTICIPANTS} people.`
              : "There's no way to draw names with these exclusions: someone has nobody left to give to. Remove an exclusion and try again.",
        };
      }
      setGuests((current) => current.map((g) => ({ ...g, giftee_id: result.matches.get(g.id) ?? null })));
      setExchange((current) => current && { ...current, drawn_at: now() });
      return { ...ok, emailed: people.filter((g) => g.email).length, withoutEmail: people.filter((g) => !g.email).length };
    },
    undo: async () => {
      setGuests((current) => current.map((g) => ({ ...g, giftee_id: null })));
      setExchange((current) => current && { ...current, drawn_at: null });
      return ok;
    },
  };
}

/** The sign-up sheet's actions, done to this page's state. Like src/lib/actions/signups.ts. */
function signupActions(
  setSheet: React.Dispatch<React.SetStateAction<SignupSheetWithRows | null>>,
): SignupActions {
  const item = (eventId: string, row: { label: string; needed: number; slot_date?: string | null }, order: number, i: number): SignupItem => ({
    id: newId("row", i),
    event_id: eventId,
    label: row.label,
    needed: row.needed,
    slot_date: row.slot_date ?? null,
    sort_order: order,
    created_at: now(),
  });
  const withRows = (change: (sheet: SignupSheetWithRows) => SignupSheetWithRows) =>
    setSheet((current) => (current ? change(current) : current));

  return {
    start: async (eventId, preset) => {
      const { title, note, rows } = SIGNUP_PRESETS[preset];
      setSheet({
        sheet: { event_id: eventId, title, note, created_at: now(), updated_at: now() },
        items: rows.map((row, i) => item(eventId, row, i, i)),
        claims: [],
      });
      return ok;
    },
    updateSheet: async (_eventId, changes) => {
      if (!changes.title.trim()) return { error: "Give the sheet a title." };
      withRows((s) => ({ ...s, sheet: { ...s.sheet, title: changes.title.trim(), note: changes.note.trim() || null } }));
      return ok;
    },
    deleteSheet: async () => {
      setSheet(null);
      return ok;
    },
    addRows: async (eventId, rows) => {
      withRows((s) => {
        const next = s.items.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1;
        return { ...s, items: [...s.items, ...rows.map((row, i) => item(eventId, row, next + i, i))] };
      });
      return { ...ok, added: rows.length };
    },
    updateRow: async (_eventId, itemId, changes) => {
      withRows((s) => ({ ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...changes } : i)) }));
      return ok;
    },
    removeRow: async (_eventId, itemId) => {
      withRows((s) => ({
        ...s,
        items: s.items.filter((i) => i.id !== itemId),
        claims: s.claims.filter((c) => c.item_id !== itemId),
      }));
      return ok;
    },
    removeClaim: async (_eventId, itemId, guestId) => {
      withRows((s) => ({ ...s, claims: s.claims.filter((c) => !(c.item_id === itemId && c.guest_id === guestId)) }));
      return ok;
    },
  };
}

/** A demo event as its host sees it. Like src/app/(protected)/dashboard/events/[eventId]/page.tsx. */
export function DemoEventHost({ eventId }: { eventId: string }) {
  const today = useDemoToday();
  const event = findDemoEvent(today, { id: eventId });
  // Events Remi & Max don't host only have a guest page, like the real site.
  if (!event || !isDemoHost(event)) notFound();
  return <HostPage key={event.id} event={event} today={today} />;
}

function HostPage({ event, today }: { event: DemoEvent; today: string }) {
  const [guests, setGuests] = useState(event.guests);
  const [exchange, setExchange] = useState(event.exchange);
  const [exclusions, setExclusions] = useState(event.exclusions);
  const [sheet, setSheet] = useState(event.signup);
  const [messages, setMessages] = useState(event.messages);
  const [hosts, setHosts] = useState(event.hosts);
  const [invites, setInvites] = useState<{ id: string; email: string | null; expires_at: string }[]>([]);

  const registry = event.registryId ? findDemoRegistry(today, { id: event.registryId }) : null;
  const theme = eventTheme(event.event_type);
  const time = formatEventTime(event);
  const publicPath = `/demo/e/${event.slug}`;
  const editPath = `/demo/dashboard/events/${event.id}/edit`;
  const isOwner = event.owner_id === DEMO_ME_ID;
  const owner = hosts.find((h) => h.isOwner);

  // The host never sees who drew whom, or what guests told only their Secret Santa.
  const shownGuests = guests.map(guestForHost);
  const status = exchange ? exchangeStatus(guests, exchange) : null;
  const signupsByGuest = sheet
    ? Object.fromEntries([...claimsByGuest(sheet)].map(([id, claims]) => [id, claims.map(describeClaim)]))
    : undefined;
  const audienceCounts = Object.fromEntries(
    (Object.keys(MESSAGE_AUDIENCES) as MessageAudience[]).map((a) => [a, messageRecipients(guests, a).length]),
  ) as Record<MessageAudience, number>;
  const copySources = demoEvents(today)
    .filter((e) => e.id !== event.id && isDemoHost(e))
    .map((e) => ({ id: e.id, title: e.title, guestCount: e.guests.length }));

  const sendMessage = async (_eventId: string, input: { audience: MessageAudience; subject: string; body: string }) => {
    const recipients = messageRecipients(guests, input.audience);
    if (recipients.length === 0) {
      return { error: `Nobody in "${MESSAGE_AUDIENCES[input.audience].label}" has an email address yet.` };
    }
    const sent: EventMessage = {
      id: newId("message"),
      event_id: event.id,
      sent_by: DEMO_ME_ID,
      kind: "message",
      audience: input.audience,
      subject: input.subject.trim(),
      body: input.body.trim(),
      recipients: recipients.length,
      created_at: now(),
    };
    setMessages((current) => [sent, ...current]);
    return { ...ok, sent: recipients.length };
  };

  const coHostActions: CoHostActions = {
    invite: async (_eventId, email) => {
      const address = email.trim().toLowerCase();
      if (!isEmail(address)) return { error: "Enter an email address." };
      if (invites.some((i) => i.email === address)) return { error: "You've already invited them." };
      setInvites((current) => [...current, { id: newId("invite"), email: address, expires_at: `${addDays(today, 14)}T00:00:00Z` }]);
      return ok;
    },
    createLink: async () => ({ error: "The demo can't make co-host links. Invite someone by email to see how it works." }),
    revoke: async (_eventId, inviteId) => {
      setInvites((current) => current.filter((i) => i.id !== inviteId));
      return ok;
    },
    remove: async (_eventId, userId) => {
      // Leaving would take this page away, so the demo keeps Remi & Max on.
      if (userId === DEMO_ME_ID) return { error: "In the demo you stay a host, so you can keep looking around." };
      setHosts((current) => current.filter((h) => h.userId !== userId));
      return ok;
    },
  };

  return (
    <DemoOwnerShell>
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/demo/dashboard/events"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-primary max-sm:min-h-11"
        >
          <ArrowLeft className="size-4" />
          Events
        </Link>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={cx("text-sm font-semibold tracking-wide uppercase", theme.text)}>
              {eventTypeLabel(event.event_type)}
            </p>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <div className="mt-1 flex flex-col gap-0.5 text-tertiary sm:flex-row sm:flex-wrap sm:gap-x-4">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-4" />
                {event.event_date ? `${formatEventDate(event.event_date)}${time ? ` · ${time}` : ""}` : "No date yet"}
              </span>
              {event.location_name && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-4" />
                  {event.location_name}
                </span>
              )}
            </div>
            {!isOwner && owner && (
              <p className="mt-2 text-sm text-tertiary">
                {owner.name.split(" ")[0]} made this event and added you as a co-host.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton path={publicPath} />
            <Button variant="outline" asChild>
              <a href={publicPath} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Preview
                </span>
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href={editPath}>
                <span className="inline-flex items-center gap-1.5">
                  <Pencil className="h-4 w-4 shrink-0" />
                  Edit
                </span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            {exchange && status && (
              <ExchangeManager
                eventId={event.id}
                exchange={exchange}
                status={status}
                guests={shownGuests}
                exclusions={exclusions}
                editHref={editPath}
                actions={exchangeActions(guests, setGuests, exclusions, setExclusions, setExchange)}
              />
            )}
            {sheet && (
              <SignupSheetManager
                // A new sheet starts the manager over.
                key={sheet.sheet.created_at}
                eventId={event.id}
                sheet={sheet.sheet}
                rows={signupRowsForHost(sheet, guests)}
                mealTrain={hidesAddressUntilSignup(event.event_type)}
                actions={signupActions(setSheet)}
              />
            )}
            <EventGuestManager
              eventId={event.id}
              eventSlug={event.slug}
              guests={shownGuests}
              maxPartySize={event.max_party_size}
              replyToEmail={DEMO_ME.email}
              basePath="/demo"
              askKids={event.ask_kids}
              hasExchange={Boolean(exchange)}
              everyoneGives={exchangeKind(exchange) === "everyone"}
              copySources={copySources}
              groups={[]}
              eventTitle={event.title}
              signups={signupsByGuest}
              questions={event.rsvp_questions}
              actions={guestActions(guests, setGuests, today)}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <Card className="gap-0 overflow-hidden py-0">
              {event.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- a picture from /public
                <img src={event.image_url} alt={`${event.title} invitation`} className="block h-auto w-full" />
              ) : (
                <Link
                  href={editPath}
                  className={cx(
                    "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center hover:opacity-90",
                    theme.bg,
                  )}
                >
                  <ImagePlus aria-hidden="true" className={cx("size-8", theme.icon)} />
                  <span className="font-medium text-primary">Add your invitation</span>
                  <span className="text-sm text-secondary">Upload a picture guests see first</span>
                </Link>
              )}
              <CardContent className="p-4">
                <p className="text-sm text-tertiary">
                  Guests see this, the details and an RSVP form at the event link.
                  {event.open_rsvp ? " Anyone with the link can RSVP." : " Only invited guests can RSVP."}
                </p>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
                    <Gift aria-hidden="true" className="size-4.5 text-brand-600" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium text-primary">Gifts</p>
                    {registry ? (
                      <p className="text-sm">
                        <a
                          href={demoRegistryPath(registry)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          {registry.title}
                        </a>
                        <span className="text-tertiary"> · {registry.honoree_names}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-tertiary">No registry linked.</p>
                    )}
                    {event.gift_note && <p className="text-sm whitespace-pre-line text-secondary">{event.gift_note}</p>}
                    <Link href={editPath} className="text-sm font-medium text-brand-600 hover:underline">
                      {registry || event.gift_note ? "Change gifts" : "Link a registry or add a gift note"}
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!sheet && <SignupSheetStarter eventId={event.id} actions={signupActions(setSheet)} />}

            <GuestMessages
              eventId={event.id}
              eventTitle={event.title}
              counts={audienceCounts}
              messages={messages}
              remindDayBefore={event.remind_day_before ?? true}
              editHref={editPath}
              sendAction={sendMessage}
            />

            <EventCoHosts
              eventId={event.id}
              hosts={hosts}
              invites={invites}
              viewerId={DEMO_ME_ID}
              actions={coHostActions}
            />

            <PlanAgainButton eventId={event.id} planAction={async () => ({ error: DEMO_NOT_SAVED })} />

            {isOwner && (
              <DeleteEventButton
                eventId={event.id}
                guestCount={guests.length}
                deleteAction={async () => ({ error: DEMO_NOT_SAVED })}
              />
            )}
          </aside>
        </div>
      </div>
    </DemoOwnerShell>
  );
}
