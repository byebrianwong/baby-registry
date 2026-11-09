-- ============================================================================
-- Manager functions check who is calling, not who the caller says they are
-- ============================================================================
-- cancel_reservation and mark_item_parent_purchased are security definer, so
-- they skip RLS, and the anon key could call them. Until now each one decided
-- who was allowed from its p_owner_id argument, which the caller passes in.
-- Anyone who knew a manager's user id could cancel that registry's gifts, or
-- mark its items as bought by the parents (which resets quantity_fulfilled).
--
-- Both now check public.is_registry_manager(..., auth.uid()). They keep their
-- signatures, so the code that calls them doesn't change, but p_owner_id is
-- ignored. The anon role can't call them at all any more. Signed-in users and
-- guests (who get an anonymous session, role authenticated) still can, and
-- they're only allowed when auth.uid() manages the registry.
--
-- cover_parent_item and reserve_cash_fund don't take a user id. Guests are
-- meant to call them, so they stay as they are.
--
-- Run this after 015_gift_reservations.sql. 015 also replaces
-- cancel_reservation, still with the p_owner_id check, so running 015 after
-- this file would undo the fix. If 015 runs again later, run this file again
-- after it.
--
-- cancel_reservation accepts gifts with status 'purchased' as well as
-- 'reserved', the same as 015, so this file keeps 015's change. Run on its own,
-- without 015, it works too: no gift has status 'purchased' until 015's code
-- confirms one.
--
-- Safe to run before or after deploying the app code: the deployed code calls
-- cancel_reservation with the signed-in user's session and passes their own id
-- as p_owner_id, and nothing in the app calls mark_item_parent_purchased.
--
-- Safe to run more than once.

begin;

-- ============================================================================
-- cancel_reservation
-- ============================================================================

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

    update public.registry_items
       set quantity_fulfilled = quantity_fulfilled - v_purchase.quantity,
           version = version + 1,
           updated_at = now()
     where id = v_purchase.registry_item_id;

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
  'Cancels a gift and gives its quantity or amount back. Only a manager of the registry (auth.uid()) can call it. p_owner_id is ignored.';

-- ============================================================================
-- mark_item_parent_purchased
-- ============================================================================

create or replace function public.mark_item_parent_purchased(
  p_item_id    uuid,
  p_owner_id   uuid,  -- ignored; the caller is auth.uid()
  p_purchased  boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_item   record;
begin
  if v_caller is null then
    raise exception 'Item not found or not authorized'
      using errcode = '42501';
  end if;

  select ri.*
    into v_item
    from public.registry_items ri
   where ri.id = p_item_id
     and public.is_registry_manager(ri.registry_id, v_caller)
   for update;

  if not found then
    raise exception 'Item not found or not authorized'
      using errcode = '42501';
  end if;

  if p_purchased then
    update public.registry_items
       set is_parent_purchased = true,
           quantity_fulfilled = quantity_needed,
           version = version + 1,
           updated_at = now()
     where id = p_item_id;
  else
    update public.registry_items
       set is_parent_purchased = false,
           quantity_fulfilled = 0,
           version = version + 1,
           updated_at = now()
     where id = p_item_id;
  end if;
end;
$$;

comment on function public.mark_item_parent_purchased(uuid, uuid, boolean) is
  'Marks an item as bought by the parents, or undoes that. Only a manager of the registry (auth.uid()) can call it. p_owner_id is ignored.';

-- ============================================================================
-- Who can call them
-- ============================================================================

-- Both need a signed-in session, so the anon role has no use for them.
revoke execute on function public.cancel_reservation(uuid, uuid) from public, anon;
revoke execute on function public.mark_item_parent_purchased(uuid, uuid, boolean) from public, anon;
grant execute on function public.cancel_reservation(uuid, uuid) to authenticated, service_role;
grant execute on function public.mark_item_parent_purchased(uuid, uuid, boolean) to authenticated, service_role;

commit;
