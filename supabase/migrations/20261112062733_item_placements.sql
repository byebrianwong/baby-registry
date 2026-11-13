-- ============================================================================
-- Items on several lists
-- ============================================================================
-- An item's home list is registry_items.registry_id, the list it was first
-- saved to. A placement puts the same item on more of its owner's lists, with
-- its own category on each. Gifts belong to the item, so a gift reserved
-- through any of those lists shows on all of them.
--
-- What this adds:
--
-- 1. registry_item_placements: one row for each extra list an item is on.
-- 2. A trigger on registries: deleting a list keeps the items that are also on
--    another list. Each moves its home to the next list it's on.
-- 3. A trigger on registry_items: deleting an item from its home list while
--    it's on another list moves it there instead, whoever deletes it.
--
-- The table is like groups and events: RLS on with no policies and no grants,
-- so only the server reaches it, with the service-role client after its own
-- checks. The server only places an item on lists with the same owner as its
-- home list, and only for that owner (src/lib/actions/saved.ts).
--
-- It only adds things, so it can run before or after the code that uses it is
-- deployed. Run it before: until it runs, the Saved tab can't put items on
-- more lists, and the pages that read placements show only each list's own
-- items.

begin;

-- --------------------------------------------------------------------------
-- 1. Placements
-- --------------------------------------------------------------------------

create table public.registry_item_placements (
  item_id     uuid not null references public.registry_items(id) on delete cascade,
  registry_id uuid not null references public.registries(id) on delete cascade,
  -- The item's category on this list. It has to be one of this list's
  -- categories; the server checks that.
  category_id uuid references public.categories(id) on delete set null,
  added_by    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (item_id, registry_id)
);

-- The primary key finds an item's lists. This finds a list's placed items.
create index idx_item_placements_registry_id on public.registry_item_placements(registry_id);
create index idx_item_placements_category_id on public.registry_item_placements(category_id)
  where category_id is not null;

alter table public.registry_item_placements enable row level security;
revoke all on public.registry_item_placements from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Keeping items when a list is deleted
-- --------------------------------------------------------------------------
-- Deleting a list deletes the items whose home it is (registry_items cascades).
-- Before that happens, an item that's also on another list moves its home to
-- the list it was placed on first, taking its category there, and that
-- placement goes. Its gifts stay with it.

create or replace function public.rehome_placed_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
begin
  for p in
    select distinct on (pl.item_id) pl.item_id, pl.registry_id, pl.category_id
      from public.registry_item_placements pl
      join public.registry_items ri on ri.id = pl.item_id
     where ri.registry_id = old.id
       and pl.registry_id <> old.id
     order by pl.item_id, pl.created_at, pl.registry_id
  loop
    update public.registry_items
       set registry_id = p.registry_id,
           category_id = p.category_id
     where id = p.item_id;

    delete from public.registry_item_placements
     where item_id = p.item_id
       and registry_id = p.registry_id;
  end loop;
  return old;
end;
$$;

-- Only the trigger calls it.
revoke execute on function public.rehome_placed_items() from public, anon, authenticated;

create trigger rehome_placed_items
  before delete on public.registries
  for each row execute function public.rehome_placed_items();

-- --------------------------------------------------------------------------
-- 3. Keeping items when one is deleted from its home list
-- --------------------------------------------------------------------------
-- Taking an item off its home list moves its home to the next list it's on,
-- and only an item on no other list is deleted. The website does this itself
-- (src/lib/item-placements.ts). The phone app and the browser extension delete
-- rows directly with the signed-in person's own access, and can't see
-- placements, so this trigger makes their deletes follow the same rule: the
-- row moves to the next list instead, and the delete skips it.
--
-- When the list itself is being deleted, rehome_placed_items has already moved
-- what stays, and the rows deleted along with the list go as usual.

create or replace function public.keep_placed_item_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_list uuid;
  next_category uuid;
begin
  if not exists (select 1 from public.registries where id = old.registry_id) then
    return old;
  end if;

  select pl.registry_id, pl.category_id
    into next_list, next_category
    from public.registry_item_placements pl
   where pl.item_id = old.id
     and pl.registry_id <> old.registry_id
   order by pl.created_at, pl.registry_id
   limit 1;

  if next_list is null then
    return old;
  end if;

  update public.registry_items
     set registry_id = next_list,
         category_id = next_category
   where id = old.id;

  delete from public.registry_item_placements
   where item_id = old.id
     and registry_id = next_list;

  -- Skip the delete. The item lives on in its new home.
  return null;
end;
$$;

revoke execute on function public.keep_placed_item_on_delete() from public, anon, authenticated;

create trigger keep_placed_item_on_delete
  before delete on public.registry_items
  for each row execute function public.keep_placed_item_on_delete();

commit;
