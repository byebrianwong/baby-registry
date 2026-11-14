-- ============================================================================
-- Group gifts: friends chip in on one item (issue #105)
-- ============================================================================
-- Someone with an account starts a group gift on an open item of a list they
-- don't manage. That reserves the item in their name ("Oz and others"), held
-- until they buy it, so nobody else does. Others chip in from a private link,
-- and pay the organizer back with Venmo, PayPal or Zelle. Regibee never holds
-- the money: it only keeps track of who said they'd chip in, and who paid.
--
-- What this adds:
--
-- 1. group_gifts: one row per group gift, with the list, item, reservation
--    (purchase) and organizer it belongs to, an optional event, a goal and a
--    note on how to pay the organizer back. Its token is the secret in the
--    link the organizer shares, /group-gift/<token>.
-- 2. group_gift_pledges: who's chipping in and how much. A pledger can be a
--    Regibee account or just a name and email, like an event guest. Each
--    pledge has its own token, in the pledger's email, to change it later.
--
-- The list's owner only ever sees the ordinary reservation in purchases. The
-- pledges stay here. Both tables are like events: RLS on with no policies and
-- no grants, so only the server reaches them, with the service-role client
-- after its own checks.
--
-- Whether a group gift is open, bought or called off comes from its
-- reservation's status in purchases, so nothing here can disagree with it.
--
-- It only adds things, so it can run before or after the code that uses it is
-- deployed. Run it before, so the new pages work as soon as they ship.

begin;

-- --------------------------------------------------------------------------
-- 1. Group gifts
-- --------------------------------------------------------------------------

create table public.group_gifts (
  id           uuid primary key default gen_random_uuid(),
  -- The secret in the organizer's share link. Anyone with it can see the
  -- gift and chip in, so it never goes in public page data.
  token        text not null unique check (char_length(token) between 20 and 64),
  registry_id  uuid not null references public.registries(id) on delete cascade,
  -- Null once the item is deleted from the list.
  item_id      uuid references public.registry_items(id) on delete set null,
  -- The reservation that holds the item, in the organizer's name.
  purchase_id  uuid references public.purchases(id) on delete set null,
  -- Set when the organizer came from an event that links the list, so the
  -- event's guests see the gift on their invitation.
  event_id     uuid references public.events(id) on delete set null,
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  goal_amount  numeric(10, 2) check (goal_amount is null or (goal_amount > 0 and goal_amount <= 100000)),
  -- How to pay the organizer back, like "Venmo @oz".
  payback_note text check (payback_note is null or char_length(payback_note) <= 200),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_group_gifts_registry_id on public.group_gifts(registry_id);
create index idx_group_gifts_organizer_id on public.group_gifts(organizer_id);
create index idx_group_gifts_event_id on public.group_gifts(event_id) where event_id is not null;
create index idx_group_gifts_purchase_id on public.group_gifts(purchase_id) where purchase_id is not null;

create trigger set_group_gifts_updated_at
  before update on public.group_gifts
  for each row execute function public.set_updated_at();

alter table public.group_gifts enable row level security;
revoke all on public.group_gifts from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Pledges
-- --------------------------------------------------------------------------

create table public.group_gift_pledges (
  id            uuid primary key default gen_random_uuid(),
  group_gift_id uuid not null references public.group_gifts(id) on delete cascade,
  -- The pledger's own secret, in their email and a cookie, to change or take
  -- back their pledge without an account.
  token         text not null unique check (char_length(token) between 20 and 64),
  -- Set when the pledger was signed in.
  user_id       uuid references public.profiles(id) on delete set null,
  name          text not null check (char_length(name) between 1 and 100),
  email         text check (email is null or char_length(email) <= 254),
  amount        numeric(10, 2) not null check (amount > 0 and amount <= 100000),
  -- Set by the organizer once they've been paid back.
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_group_gift_pledges_group_gift_id on public.group_gift_pledges(group_gift_id);
create index idx_group_gift_pledges_user_id on public.group_gift_pledges(user_id) where user_id is not null;

-- One pledge per account, and per email address, on each group gift. The
-- server stores emails lowercased.
create unique index group_gift_pledges_gift_user_key
  on public.group_gift_pledges(group_gift_id, user_id)
  where user_id is not null;
create unique index group_gift_pledges_gift_email_key
  on public.group_gift_pledges(group_gift_id, lower(email))
  where email is not null;

create trigger set_group_gift_pledges_updated_at
  before update on public.group_gift_pledges
  for each row execute function public.set_updated_at();

alter table public.group_gift_pledges enable row level security;
revoke all on public.group_gift_pledges from anon, authenticated;

commit;
