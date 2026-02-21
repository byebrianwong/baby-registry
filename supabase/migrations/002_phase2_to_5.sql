-- ============================================================================
-- Phase 2-5 Migration: Parent self-purchase, cancel reservation, cover items
-- ============================================================================

-- Add is_parent_purchased to registry_items
alter table public.registry_items
  add column is_parent_purchased boolean not null default false;

-- ============================================================================
-- RPC: cancel_reservation
-- Owner cancels a gift giver's reservation, restoring item/fund quantities
-- ============================================================================

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
  -- Get the purchase and verify ownership
  select p.*
    into v_purchase
    from public.purchases p
   where p.id = p_purchase_id
     and p.status = 'reserved'
   for update;

  if v_purchase is null then
    raise exception 'Purchase not found or already cancelled';
  end if;

  -- Verify ownership via registry_item or cash_fund
  if v_purchase.registry_item_id is not null then
    if not exists (
      select 1 from public.registry_items ri
        join public.registries r on r.id = ri.registry_id
       where ri.id = v_purchase.registry_item_id
         and r.owner_id = p_owner_id
    ) then
      raise exception 'Not authorized to cancel this reservation';
    end if;

    -- Restore quantity
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
         and r.owner_id = p_owner_id
    ) then
      raise exception 'Not authorized to cancel this reservation';
    end if;

    -- Restore fund amount
    update public.cash_funds
       set current_amount = current_amount - coalesce(v_purchase.amount, 0),
           updated_at = now()
     where id = v_purchase.cash_fund_id;
  end if;

  -- Mark purchase as cancelled
  update public.purchases
     set status = 'cancelled',
         updated_at = now()
   where id = p_purchase_id;
end;
$$;

-- ============================================================================
-- RPC: mark_item_parent_purchased
-- Parent marks an item as self-purchased (sets quantity_fulfilled atomically)
-- ============================================================================

create or replace function public.mark_item_parent_purchased(
  p_item_id    uuid,
  p_owner_id   uuid,
  p_purchased  boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  -- Lock and verify ownership
  select ri.*
    into v_item
    from public.registry_items ri
    join public.registries r on r.id = ri.registry_id
   where ri.id = p_item_id
     and r.owner_id = p_owner_id
   for update;

  if v_item is null then
    raise exception 'Item not found or not authorized';
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

-- ============================================================================
-- RPC: cover_parent_item
-- Gift giver pledges to cover a parent-purchased item (no quantity change)
-- ============================================================================

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
set search_path = public
as $$
declare
  v_item record;
  v_purchase_id uuid;
begin
  -- Verify item exists and is parent-purchased
  select ri.*
    into v_item
    from public.registry_items ri
   where ri.id = p_item_id
     and ri.is_parent_purchased = true;

  if v_item is null then
    raise exception 'Item not found or not marked as parent-purchased';
  end if;

  -- Create the purchase record (don't modify quantity_fulfilled)
  insert into public.purchases (registry_item_id, buyer_name, buyer_email, quantity, status, message)
  values (p_item_id, p_buyer_name, p_buyer_email, p_quantity, 'reserved', p_message)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;
