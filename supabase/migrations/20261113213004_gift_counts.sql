-- ============================================================================
-- Gift counts stay right (#112, #113, #119)
-- ============================================================================
-- An item's quantity_fulfilled follows one rule:
--
-- - When the owners bought it themselves (is_parent_purchased), it equals
--   quantity_needed. Guests who cover it send money, and their gifts don't
--   change the count.
-- - Otherwise it's the quantity of the item's guest gifts that aren't
--   cancelled, held reservations included.
--
-- Three things broke that rule. This file fixes them:
--
-- 1. reserve_cash_fund and cover_parent_item took any amount or quantity.
--    Guests call them with the anon key, so a negative amount lowered a fund's
--    total, and a negative quantity lowered an item's covered count (#112).
--    Both now refuse an amount of zero or less and a quantity below 1.
--    cover_parent_item also gets 008_cover_item_quantity_cap.sql's cap, which
--    never ran on production. Their arguments don't change, so the code that
--    calls them doesn't either.
--
-- 2. cancel_reservation took a cancelled gift's quantity off the item's count,
--    even for a gift that covered an item the owners bought (#113). It now
--    leaves the count alone for those items, the same as release_registry_gift
--    in 015_gift_reservations.sql. It keeps 016's check that the caller
--    manages the registry.
--
-- 3. Unmarking "already bought" set quantity_fulfilled to 0, so guests'
--    reservations from before it was marked stopped counting, and another
--    guest could reserve the same gift (#119). The website and the phone app
--    both update the row directly. A trigger now sets the count whenever
--    is_parent_purchased changes: quantity_needed when it's marked, the
--    guests' gifts when it's unmarked. Gifts that covered the item count too
--    once it's unmarked, so cancelling one later takes it off again and the
--    count stays right.
--
-- It changes no rows, and counts already off stay as they are.
--
-- Safe to run before or after deploying the code, and more than once. The
-- deployed code keeps working: it still sends quantity_fulfilled, and the
-- trigger corrects it.

begin;

-- ============================================================================
-- 1. Amounts and quantities must be positive
-- ============================================================================

create or replace function public.reserve_cash_fund(
  p_fund_id       uuid,
  p_buyer_name    text,
  p_amount        decimal,
  p_buyer_email   text default null,
  p_message       text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal        decimal;
  v_current     decimal;
  v_purchase_id uuid;
begin
  -- Anyone can call this function, so a zero or negative amount must not
  -- lower the fund's total.
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than zero';
  end if;

  -- Lock the row to prevent concurrent over-contribution
  select cf.goal_amount, cf.current_amount
    into v_goal, v_current
    from public.cash_funds cf
   where cf.id = p_fund_id
   for update;

  if v_current is null then
    raise exception 'Cash fund not found';
  end if;

  -- If there is a goal, ensure we do not exceed it
  if v_goal is not null and (v_current + p_amount) > v_goal then
    raise exception 'Contribution exceeds fund goal. Goal: %, Current: %, Attempted: %', v_goal, v_current, p_amount;
  end if;

  update public.cash_funds
     set current_amount = current_amount + p_amount,
         updated_at = now()
   where id = p_fund_id;

  insert into public.purchases (cash_fund_id, buyer_name, buyer_email, amount, status, message)
  values (p_fund_id, p_buyer_name, p_buyer_email, p_amount, 'reserved', p_message)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

create or replace function public.cover_parent_item(
  p_item_id      uuid,
  p_buyer_name   text,
  p_buyer_email  text default null,
  p_quantity     int  default 1,
  p_message      text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item            record;
  v_already_covered int;
  v_purchase_id     uuid;
begin
  -- Anyone can call this function, so a zero or negative quantity must not
  -- lower the item's covered count.
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  select ri.*
    into v_item
    from public.registry_items ri
   where ri.id = p_item_id
     and ri.is_parent_purchased = true
   for update;

  if not found then
    raise exception 'Item not found or not marked as parent-purchased';
  end if;

  -- From 008_cover_item_quantity_cap.sql: guests can't cover more than the
  -- owners bought.
  select coalesce(sum(p.quantity), 0)
    into v_already_covered
    from public.purchases p
   where p.registry_item_id = p_item_id
     and p.status <> 'cancelled';

  if p_quantity > (v_item.quantity_needed - v_already_covered) then
    raise exception 'Not enough items available to gift. % of % available.',
      greatest(0, v_item.quantity_needed - v_already_covered), v_item.quantity_needed;
  end if;

  -- Covering doesn't change quantity_fulfilled.
  insert into public.purchases (registry_item_id, buyer_name, buyer_email, quantity, status, message)
  values (p_item_id, p_buyer_name, p_buyer_email, p_quantity, 'reserved', p_message)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

-- ============================================================================
-- 2. cancel_reservation leaves bought items' counts alone
-- ============================================================================

-- The same as 016_rpc_caller_from_auth_uid.sql, except for the item's count.
create or replace function public.cancel_reservation(
  p_purchase_id uuid,
  p_owner_id    uuid  -- ignored; the caller is auth.uid()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller   uuid := auth.uid();
  v_purchase record;
  v_parent   boolean;
begin
  if v_caller is null then
    raise exception 'Not authorized to cancel this reservation'
      using errcode = '42501';
  end if;

  select p.*
    into v_purchase
    from public.purchases p
   where p.id = p_purchase_id
     and p.status in ('reserved', 'purchased')
   for update;

  if not found then
    raise exception 'Purchase not found or already cancelled';
  end if;

  if v_purchase.registry_item_id is not null then
    if not exists (
      select 1 from public.registry_items ri
       where ri.id = v_purchase.registry_item_id
         and public.is_registry_manager(ri.registry_id, v_caller)
    ) then
      raise exception 'Not authorized to cancel this reservation'
        using errcode = '42501';
    end if;

    select ri.is_parent_purchased
      into v_parent
      from public.registry_items ri
     where ri.id = v_purchase.registry_item_id
     for update;

    -- Covering an item the owners bought never added to its count, so
    -- cancelling one doesn't take anything off.
    if not coalesce(v_parent, false) then
      update public.registry_items
         set quantity_fulfilled = greatest(0, quantity_fulfilled - v_purchase.quantity),
             version = version + 1,
             updated_at = now()
       where id = v_purchase.registry_item_id;
    end if;

  elsif v_purchase.cash_fund_id is not null then
    if not exists (
      select 1 from public.cash_funds cf
       where cf.id = v_purchase.cash_fund_id
         and public.is_registry_manager(cf.registry_id, v_caller)
    ) then
      raise exception 'Not authorized to cancel this reservation'
        using errcode = '42501';
    end if;

    update public.cash_funds
       set current_amount = current_amount - coalesce(v_purchase.amount, 0),
           updated_at = now()
     where id = v_purchase.cash_fund_id;

  else
    raise exception 'Not authorized to cancel this reservation'
      using errcode = '42501';
  end if;

  update public.purchases
     set status = 'cancelled',
         updated_at = now()
   where id = p_purchase_id;
end;
$$;

comment on function public.cancel_reservation(uuid, uuid) is
  'Cancels a gift and gives its quantity or amount back, except on items the owners bought themselves. Only a manager of the registry (auth.uid()) can call it. p_owner_id is ignored.';

-- Unchanged from 016: it needs a signed-in session.
revoke execute on function public.cancel_reservation(uuid, uuid) from public, anon;
grant execute on function public.cancel_reservation(uuid, uuid) to authenticated, service_role;

-- ============================================================================
-- 3. Marking or unmarking "already bought" recounts the item
-- ============================================================================

-- security definer, so the count includes every gift even when the owner hides
-- what's been reserved from themselves.
create or replace function public.recount_when_bought_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_given bigint;
begin
  if new.is_parent_purchased then
    new.quantity_fulfilled := new.quantity_needed;
  else
    select coalesce(sum(p.quantity), 0)
      into v_given
      from public.purchases p
     where p.registry_item_id = new.id
       and p.status in ('reserved', 'purchased');

    new.quantity_fulfilled := least(new.quantity_needed, v_given)::int;
  end if;

  return new;
end;
$$;

revoke execute on function public.recount_when_bought_changes() from public, anon, authenticated;

drop trigger if exists recount_when_bought_changes on public.registry_items;
create trigger recount_when_bought_changes
  before update of is_parent_purchased on public.registry_items
  for each row
  when (old.is_parent_purchased is distinct from new.is_parent_purchased)
  execute function public.recount_when_bought_changes();

commit;
