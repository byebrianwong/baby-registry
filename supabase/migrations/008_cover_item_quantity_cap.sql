-- ============================================================================
-- Migration 007: Add quantity cap enforcement to cover_parent_item RPC
-- Prevents guests from covering more items than the parent purchased
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
  v_already_covered int;
  v_purchase_id uuid;
begin
  -- Verify item exists and is parent-purchased
  select ri.*
    into v_item
    from public.registry_items ri
   where ri.id = p_item_id
     and ri.is_parent_purchased = true
   for update;

  if v_item is null then
    raise exception 'Item not found or not marked as parent-purchased';
  end if;

  -- Sum existing non-cancelled cover purchases for this item
  select coalesce(sum(quantity), 0)
    into v_already_covered
    from public.purchases
   where registry_item_id = p_item_id
     and status != 'cancelled';

  -- Check quantity cap
  if p_quantity > (v_item.quantity_needed - v_already_covered) then
    raise exception 'Not enough items available to gift. % of % available.',
      (v_item.quantity_needed - v_already_covered), v_item.quantity_needed;
  end if;

  -- Create the purchase record
  insert into public.purchases (registry_item_id, buyer_name, buyer_email, quantity, status, message)
  values (p_item_id, p_buyer_name, p_buyer_email, p_quantity, 'reserved', p_message)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;
