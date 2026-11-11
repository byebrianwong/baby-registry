-- ============================================================================
-- Event co-hosts, several lists per event, gift notes and gift exchanges
-- ============================================================================
-- What this adds:
--
-- 1. Co-hosts. An event is managed by its owner and the co-hosts on
--    event_hosts. Before this, the managers of the one linked registry could
--    manage the event. They're copied in as co-hosts below, so nobody loses
--    access.
-- 2. Several lists per event, on event_registries. Anyone with a registry's
--    share link can see it, so a host can link any registry by its link: a
--    friend throwing a baby shower links the parents' registry without
--    managing it. Linking gives no rights over the list, and the list's
--    managers get none over the event.
-- 3. A gift note on events ("A book instead of a card, please"), a switch to
--    ask how many kids are coming, and more occasions.
-- 4. Gift exchanges (Secret Santa). gift_exchanges holds the settings, guests
--    join on event_guests, exchange_exclusions holds pairs who shouldn't
--    draw each other, and event_guests.giftee_id holds who each person drew.
-- 5. On purchases: which event guest gave the gift, and hide_giver for a
--    Secret Santa. A Secret Santa's purchase row says "Secret Santa" with no
--    email, because a list's owners can read their purchases with the anon
--    key (the mobile app does). The real name and email move to
--    secret_givers, which only the server reads, for the giver's own emails.
--
-- Every new table is like events: RLS on with no policies and no grants, so
-- only the server reaches it, with the service-role client after its own
-- checks.
--
-- Run this before deploying the code that uses it. It only adds things, except
-- can_manage_event, which now checks co-hosts instead of registry managers.
-- The deployed code only uses that function for invitation picture uploads,
-- and the backfill makes those managers co-hosts first. events.registry_id
-- stays until the old code is gone; a trigger copies any link the old code
-- makes into event_registries.

begin;

-- --------------------------------------------------------------------------
-- 1. Co-hosts
-- --------------------------------------------------------------------------

create table public.event_hosts (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index idx_event_hosts_user_id on public.event_hosts(user_id);

alter table public.event_hosts enable row level security;
revoke all on public.event_hosts from anon, authenticated;

-- Invitations to co-host, by email or by a link the host shares.
create table public.event_host_invites (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  -- Null for a link the host copies and sends themselves.
  email      text check (char_length(email) <= 254),
  token      text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index idx_event_host_invites_event_id on public.event_host_invites(event_id);

alter table public.event_host_invites enable row level security;
revoke all on public.event_host_invites from anon, authenticated;

-- Managers of an event's registry could manage the event until now. Keep
-- that: each one who isn't the owner becomes a co-host.
insert into public.event_hosts (event_id, user_id)
select e.id, m.user_id
  from public.events e
  join public.registry_managers m on m.registry_id = e.registry_id
 where m.user_id <> e.owner_id
on conflict do nothing;

-- --------------------------------------------------------------------------
-- 2. Lists linked to an event
-- --------------------------------------------------------------------------

create table public.event_registries (
  event_id    uuid not null references public.events(id) on delete cascade,
  registry_id uuid not null references public.registries(id) on delete cascade,
  linked_by   uuid references public.profiles(id) on delete set null,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  primary key (event_id, registry_id)
);

create index idx_event_registries_registry_id on public.event_registries(registry_id);

alter table public.event_registries enable row level security;
revoke all on public.event_registries from anon, authenticated;

insert into public.event_registries (event_id, registry_id, linked_by)
select id, registry_id, owner_id
  from public.events
 where registry_id is not null
on conflict do nothing;

-- The deployed code still writes events.registry_id. Until it's replaced,
-- copy each link it makes into event_registries. A later migration drops the
-- column and this trigger.
create or replace function public.copy_event_registry_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.registry_id is not null then
    insert into public.event_registries (event_id, registry_id, linked_by)
    values (new.id, new.registry_id, new.owner_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger copy_event_registry_link
  after insert or update of registry_id on public.events
  for each row execute function public.copy_event_registry_link();

-- --------------------------------------------------------------------------
-- 3. Who can manage an event: its owner or a co-host
-- --------------------------------------------------------------------------

create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.events e
     where e.id = p_event_id
       and (
         e.owner_id = (select auth.uid())
         or exists (
           select 1
             from public.event_hosts h
            where h.event_id = e.id
              and h.user_id = (select auth.uid())
         )
       )
  );
$$;

revoke execute on function public.can_manage_event(uuid) from public, anon;
grant execute on function public.can_manage_event(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 4. Gift notes, kids, more occasions, and repeats
-- --------------------------------------------------------------------------

alter table public.events
  -- Shown with the gifts on the invitation: "No gifts, please", "A book
  -- instead of a card", "Bring a wrapped gift around $25".
  add column gift_note       text check (char_length(gift_note) <= 500),
  -- When on, the RSVP asks how many of the party are kids.
  add column ask_kids        boolean not null default false,
  -- The event this one was copied from with "Plan it again". A gift
  -- exchange uses it to avoid last time's pairs.
  add column repeated_from   uuid references public.events(id) on delete set null;

alter table public.events drop constraint events_event_type_check;
alter table public.events add constraint events_event_type_check
  check (event_type in (
    'baby_shower',
    'sip_and_see',
    'bridal_shower',
    'wedding',
    'engagement',
    'bachelor',
    'birthday',
    'kids_birthday',
    'christmas',
    'gift_exchange',
    'holiday',
    'housewarming',
    'graduation',
    'retirement',
    'gathering',
    'other'
  ));

alter table public.event_guests
  -- Of party_size, how many are kids. Only asked when events.ask_kids is on.
  add column kids_count smallint not null default 0 check (kids_count between 0 and 20);

-- --------------------------------------------------------------------------
-- 5. Gift exchanges
-- --------------------------------------------------------------------------

-- One per event, when the host turns the exchange on.
create table public.gift_exchanges (
  event_id   uuid primary key references public.events(id) on delete cascade,
  -- As the host writes it: "$25", "$20 to $30", "£15".
  budget     text check (char_length(budget) <= 40),
  -- The day the host plans to draw names. Guests see it.
  draw_by    date,
  -- No get-together: gifts are mailed, so everyone gives a shipping address
  -- that only the person who draws them sees.
  mailed     boolean not null default false,
  -- When names were drawn. Null until then.
  drawn_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_gift_exchanges_updated_at
  before update on public.gift_exchanges
  for each row execute function public.set_updated_at();

alter table public.gift_exchanges enable row level security;
revoke all on public.gift_exchanges from anon, authenticated;

alter table public.event_guests
  add column in_exchange      boolean not null default false,
  -- A link to the guest's wishlist: a Regibee registry or any store's list.
  add column wishlist_url     text check (char_length(wishlist_url) <= 500),
  add column gift_ideas       text check (char_length(gift_ideas) <= 1000),
  add column shipping_address text check (char_length(shipping_address) <= 300),
  -- Who this guest drew. Only that guest sees it, on their own link.
  add column giftee_id        uuid references public.event_guests(id) on delete set null;

-- Nobody is drawn twice.
create unique index event_guests_giftee_key
  on public.event_guests(giftee_id)
  where giftee_id is not null;

-- Pairs who won't draw each other, either way round. guest_a is the smaller
-- id, so each pair is stored once.
create table public.exchange_exclusions (
  event_id   uuid not null references public.events(id) on delete cascade,
  guest_a    uuid not null references public.event_guests(id) on delete cascade,
  guest_b    uuid not null references public.event_guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, guest_a, guest_b),
  check (guest_a < guest_b)
);

alter table public.exchange_exclusions enable row level security;
revoke all on public.exchange_exclusions from anon, authenticated;

-- --------------------------------------------------------------------------
-- 6. Purchases: the event guest who gave it, and secret givers
-- --------------------------------------------------------------------------

alter table public.purchases
  -- Set when a guest reserves from an event's invitation, so the gift can be
  -- matched to their RSVP.
  add column event_guest_id uuid references public.event_guests(id) on delete set null,
  -- A Secret Santa's gift: the list's owners see "Secret Santa", not the
  -- giver's name or email. The giver still gets their own emails.
  add column hide_giver     boolean not null default false;

create index idx_purchases_event_guest_id
  on public.purchases(event_guest_id)
  where event_guest_id is not null;

-- The real giver of each Secret Santa gift. Only the server reads it, to
-- email the giver about their own gift.
create table public.secret_givers (
  purchase_id uuid primary key references public.purchases(id) on delete cascade,
  buyer_name  text not null,
  buyer_email text,
  created_at  timestamptz not null default now()
);

alter table public.secret_givers enable row level security;
revoke all on public.secret_givers from anon, authenticated;

commit;
