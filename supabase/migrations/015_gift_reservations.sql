-- Guests reserve a gift, buy it, then confirm it.
--
-- A reservation is a purchase with status 'reserved' and a reserved_until
-- time. It holds the item for GIFT_HOLD_DAYS (src/lib/gifts.ts). A daily job
-- (src/app/api/cron/gift-reservations) emails a reminder and releases
-- reservations whose time has run out. When the guest confirms, the status
-- becomes 'purchased'.
--
-- Gifts saved before this change keep status 'reserved' with no
-- reserved_until. They count as given and never expire, as before.
--
-- This file is safe to run before the code that uses it is deployed. The live
-- site calls reserve_registry_item without p_hold_days, which keeps today's
-- behavior. Run it before deploying the new code, which needs p_hold_days and
-- the new functions.

begin;

alter table public.purchases
  add column if not exists reserved_until timestamptz,
  add column if not exists reminders_sent smallint not null default 0;

create index if not exists idx_purchases_open_reservations
  on public.purchases (reserved_until)
  where status = 'reserved' and reserved_until is not null;

-- ============================================================================
-- reserve_registry_item gains p_hold_days
-- ============================================================================

-- Drop the old signature first. Two overloads would leave PostgREST unable to
-- choose between them.
drop function if exists public.reserve_registry_item(uuid, text, text, integer, text);

create function public.reserve_registry_item(
  p_item_id       uuid,
  p_buyer_name    text,
  p_buyer_email   text default null,
  p_quantity      int  default 1,
  p_message       text default null,
  p_hold_days     int  default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available   int;
  v_purchase_id uuid;
begin
  -- Anyone can call this function, so a zero or negative quantity must not
  -- lower the item's fulfilled count.
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  if p_hold_days is not null and (p_hold_days < 1 or p_hold_days > 30) then
    raise exception 'A reservation is held for 1 to 30 days';
  end if;

  -- Lock the row to prevent concurrent over-reservation
  select (quantity_needed - quantity_fulfilled)
    into v_available
    from public.registry_items
   where id = p_item_id
   for update;

  if v_available is null then
    raise exception 'Registry item not found';
  end if;

  if p_quantity > v_available then
    raise exception 'Not enough quantity available. Requested: %, Available: %', p_quantity, v_available;
  end if;

  update public.registry_items
     set quantity_fulfilled = quantity_fulfilled + p_quantity,
         version = version + 1,
         updated_at = now()
   where id = p_item_id;

  insert into public.purchases
    (registry_item_id, buyer_name, buyer_email, quantity, status, message, reserved_until)
  values
    (p_item_id, p_buyer_name, p_buyer_email, p_quantity, 'reserved', p_message,
     case when p_hold_days is null then null else now() + make_interval(days => p_hold_days) end)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

-- ============================================================================
-- confirm_registry_gift: the guest bought it
-- ============================================================================

-- Returns true when the gift changed from reserved to purchased, false when it
-- was already purchased. Only server code calls it, with the purchase id from
-- the guest's gifts cookie or email link.
create or replace function public.confirm_registry_gift(p_purchase_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status
    into v_status
    from public.purchases
   where id = p_purchase_id
     and registry_item_id is not null
   for update;

  if v_status is null then
    raise exception 'Gift not found';
  end if;

  if v_status = 'cancelled' then
    raise exception 'This reservation was released';
  end if;

  if v_status = 'purchased' then
    return false;
  end if;

  update public.purchases
     set status = 'purchased',
         updated_at = now()
   where id = p_purchase_id;

  return true;
end;
$$;

-- ============================================================================
-- release_registry_gift: the item goes back on the list
-- ============================================================================

-- Returns true when the gift was released, false when it already was.
create or replace function public.release_registry_gift(p_purchase_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_parent   boolean;
begin
  select *
    into v_purchase
    from public.purchases
   where id = p_purchase_id
     and registry_item_id is not null
   for update;

  if not found then
    raise exception 'Gift not found';
  end if;

  if v_purchase.status = 'cancelled' then
    return false;
  end if;

  select is_parent_purchased
    into v_parent
    from public.registry_items
   where id = v_purchase.registry_item_id
   for update;

  -- Covering an item the owners bought themselves never added to the
  -- fulfilled count, so releasing one doesn't subtract from it.
  if not coalesce(v_parent, false) then
    update public.registry_items
       set quantity_fulfilled = greatest(0, quantity_fulfilled - v_purchase.quantity),
           version = version + 1,
           updated_at = now()
     where id = v_purchase.registry_item_id;
  end if;

  update public.purchases
     set status = 'cancelled',
         updated_at = now()
   where id = p_purchase_id;

  return true;
end;
$$;

-- ============================================================================
-- release_expired_registry_gifts: run by the daily job
-- ============================================================================

create or replace function public.release_expired_registry_gifts()
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  for v_id in
    select id
      from public.purchases
     where status = 'reserved'
       and reserved_until is not null
       and reserved_until <= now()
       and registry_item_id is not null
     order by reserved_until
  loop
    if public.release_registry_gift(v_id) then
      return next v_id;
    end if;
  end loop;
end;
$$;

-- Guests reach these through server code only, which checks the purchase id
-- the guest holds. The anon key must not call them directly.
revoke execute on function public.confirm_registry_gift(uuid) from public, anon, authenticated;
revoke execute on function public.release_registry_gift(uuid) from public, anon, authenticated;
revoke execute on function public.release_expired_registry_gifts() from public, anon, authenticated;
grant execute on function public.confirm_registry_gift(uuid) to service_role;
grant execute on function public.release_registry_gift(uuid) to service_role;
grant execute on function public.release_expired_registry_gifts() to service_role;

-- ============================================================================
-- cancel_reservation: managers can also cancel confirmed gifts
-- ============================================================================

-- Same as 006_multi_manager.sql, except that a 'purchased' gift can be
-- cancelled too, now that confirmed gifts have that status.
create or replace function public.cancel_reservation(
  p_purchase_id uuid,
  p_owner_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase    record;
begin
  select p.*
    into v_purchase
    from public.purchases p
   where p.id = p_purchase_id
     and p.status in ('reserved', 'purchased')
   for update;

  if v_purchase is null then
    raise exception 'Purchase not found or already cancelled';
  end if;

  if v_purchase.registry_item_id is not null then
    if not exists (
      select 1 from public.registry_items ri
        join public.registries r on r.id = ri.registry_id
       where ri.id = v_purchase.registry_item_id
         and public.is_registry_manager(r.id, p_owner_id)
    ) then
      raise exception 'Not authorized to cancel this reservation';
    end if;

    update public.registry_items
       set quantity_fulfilled = quantity_fulfilled - v_purchase.quantity,
           version = version + 1,
           updated_at = now()
     where id = v_purchase.registry_item_id;

  elsif v_purchase.cash_fund_id is not null then
    if not exists (
      select 1 from public.cash_funds cf
        join public.registries r on r.id = cf.registry_id
       where cf.id = v_purchase.cash_fund_id
         and public.is_registry_manager(r.id, p_owner_id)
    ) then
      raise exception 'Not authorized to cancel this reservation';
    end if;

    update public.cash_funds
       set current_amount = current_amount - coalesce(v_purchase.amount, 0),
           updated_at = now()
     where id = v_purchase.cash_fund_id;
  end if;

  update public.purchases
     set status = 'cancelled',
         updated_at = now()
   where id = p_purchase_id;
end;
$$;

commit;
