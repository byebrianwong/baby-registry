-- ============================================================================
-- "Everyone gives everyone" events, and revealing hidden gifts after an event
-- ============================================================================
-- What this adds:
--
-- 1. gift_exchanges.kind. 'draw' is the Secret Santa main already has: names
--    are drawn and each person gives one gift. 'everyone' is a family
--    Christmas: every guest links a wish list, and everyone shops from
--    everyone's lists. Existing exchanges are draws.
-- 2. event_guests.wishlist_registry_id: the Regibee list behind a guest's
--    wishlist_url, when it is one. The event page lists it for the other
--    guests, and gifts reserved on it can be revealed after the event.
--    Existing regibee.com links are filled in below.
-- 3. Revealing hidden gifts. A list can hide what's been reserved from its
--    owner (#118, registries.settings.hide_reservations). When such a list is
--    linked to an event, by event_registries or as a guest's wish list, its
--    owner sees the gifts reserved before the event from the day after it.
--    "The day after" starts at 12:00 UTC on the next day, when it is the next
--    day everywhere on earth. gifts_revealed_through() returns the latest such
--    moment that has passed: gifts reserved before it are revealed.
-- 4. gift_reveals: one row per event and list once the daily job has
--    revealed the list's gifts and emailed its owner. It keeps a reveal in
--    place if the event is later unlinked, deleted or moved, and keeps the
--    email from going twice. Like the other event tables, only the server
--    reaches it.
-- 5. The purchases rule. A list's managers read its purchases with the anon
--    key (the mobile app does). Before this, an owner who hid reservations
--    could still read every reservation, with each giver's name, even though
--    the pages showed nothing. Now the owner can't read a purchase on such a
--    list until it is revealed. Co-managers still read everything, as before.
--
-- How a Secret Santa's gift reveals: it stays a Secret Santa's. Its row says
-- "Secret Santa" (hide_giver, 20261111103947), and the reveal shows the gift
-- with that name. The giver was told the owner would never see their name.
--
-- Run it before deploying the code that uses it: that code saves
-- wishlist_registry_id with each RSVP, and an RSVP with a wish list fails
-- without the column. Running it first is safe. It only adds things, except
-- the purchases rule, which only takes away rows the live code already hides
-- from owners: the live website and app show an owner who hides
-- reservations no gifts at all.

begin;

-- --------------------------------------------------------------------------
-- 1. Gift exchange kinds
-- --------------------------------------------------------------------------

alter table public.gift_exchanges
  add column kind text not null default 'draw' check (kind in ('draw', 'everyone'));

-- --------------------------------------------------------------------------
-- 2. A guest's Regibee wish list
-- --------------------------------------------------------------------------

alter table public.event_guests
  add column wishlist_registry_id uuid references public.registries(id) on delete set null;

create index idx_event_guests_wishlist_registry_id
  on public.event_guests(wishlist_registry_id)
  where wishlist_registry_id is not null;

update public.event_guests g
   set wishlist_registry_id = r.id
  from public.registries r
 where g.wishlist_registry_id is null
   and g.wishlist_url ~* '^https?://(www\.)?regibee\.com/r/'
   and r.slug = lower(substring(g.wishlist_url from '/r/([A-Za-z0-9][A-Za-z0-9-]*)'));

-- --------------------------------------------------------------------------
-- 3 and 4. Reveals
-- --------------------------------------------------------------------------

create table public.gift_reveals (
  id          uuid primary key default gen_random_uuid(),
  -- The event whose day-after revealed the gifts. Not a foreign key, on
  -- purpose: events and registries already link through event_registries,
  -- and a second route between them would make Supabase's API refuse joins
  -- between the two as ambiguous (PGRST201, see CLAUDE.md). The reveal stays
  -- if the event is deleted.
  event_id    uuid,
  registry_id uuid not null references public.registries(id) on delete cascade,
  -- Gifts reserved before this moment are revealed.
  revealed_at timestamptz not null,
  -- When the owner was emailed. Null when there was nothing to tell them.
  emailed_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (event_id, registry_id)
);

create index idx_gift_reveals_registry_id on public.gift_reveals(registry_id);

alter table public.gift_reveals enable row level security;
revoke all on public.gift_reveals from anon, authenticated;

-- The same test as hidesReservations in src/lib/gifts.ts: the owner chose to
-- hide reservations, and doesn't keep the list for a child.
create or replace function public.hides_reservations(p_settings jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_settings -> 'hide_reservations' = 'true'::jsonb, false)
     and not coalesce(p_settings -> 'for_child' = 'true'::jsonb, false);
$$;

-- The latest reveal moment that has passed for a list: the day after an event
-- it's linked to, at 12:00 UTC, or a reveal the daily job logged. Gifts
-- reserved before it are revealed. Null when nothing has been revealed.
-- Only the list's managers and the server get an answer.
create or replace function public.gifts_revealed_through(p_registry_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  with linked as (
    select er.event_id from public.event_registries er where er.registry_id = p_registry_id
    union
    select g.event_id from public.event_guests g where g.wishlist_registry_id = p_registry_id
  ),
  moments as (
    select ((e.event_date + 1)::timestamp + interval '12 hours') at time zone 'UTC' as reveal_at
      from public.events e
      join linked l on l.event_id = e.id
     where e.event_date is not null
    union all
    select r.revealed_at from public.gift_reveals r where r.registry_id = p_registry_id
  )
  select max(m.reveal_at)
    from moments m
   where m.reveal_at <= now()
     and (
       public.is_registry_manager(p_registry_id, (select auth.uid()))
       or (select auth.role()) = 'service_role'
     );
$$;

revoke execute on function public.gifts_revealed_through(uuid) from public, anon;
grant execute on function public.gifts_revealed_through(uuid) to authenticated, service_role;

-- Whether a purchase made at p_created_at on this list is hidden from the
-- person asking: they own the list, it hides reservations, and the purchase
-- hasn't been revealed.
create or replace function public.gift_hidden_from_owner(p_registry_id uuid, p_created_at timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner    uuid;
  v_settings jsonb;
  v_through  timestamptz;
begin
  select r.owner_id, r.settings into v_owner, v_settings
    from public.registries r
   where r.id = p_registry_id;
  if (select auth.uid()) is null
     or v_owner is distinct from (select auth.uid())
     or not public.hides_reservations(v_settings) then
    return false;
  end if;
  v_through := public.gifts_revealed_through(p_registry_id);
  return v_through is null or p_created_at >= v_through;
end;
$$;

revoke execute on function public.gift_hidden_from_owner(uuid, timestamptz) from public, anon;
grant execute on function public.gift_hidden_from_owner(uuid, timestamptz) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- 5. Who can read purchases
-- --------------------------------------------------------------------------

drop policy if exists "Managers can view purchases" on public.purchases;
create policy "Managers can view purchases"
  on public.purchases for select
  using (
    exists (
      select 1 from public.registry_items ri
       where ri.id = purchases.registry_item_id
         and public.is_registry_manager(ri.registry_id, (select auth.uid()))
         and not public.gift_hidden_from_owner(ri.registry_id, purchases.created_at)
    )
    or
    exists (
      select 1 from public.cash_funds cf
       where cf.id = purchases.cash_fund_id
         and public.is_registry_manager(cf.registry_id, (select auth.uid()))
         and not public.gift_hidden_from_owner(cf.registry_id, purchases.created_at)
    )
  );

commit;
