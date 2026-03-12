-- ============================================================================
-- Multi-Manager Registry Support
-- ============================================================================

-- ============================================================================
-- 1. NEW TABLES
-- ============================================================================

-- registry_managers: tracks who can manage each registry
create table public.registry_managers (
  id          uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.registries(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'manager'
              check (role in ('owner', 'manager')),
  created_at  timestamptz not null default now(),
  unique (registry_id, user_id)
);

create index idx_registry_managers_registry_id on public.registry_managers(registry_id);
create index idx_registry_managers_user_id on public.registry_managers(user_id);

-- registry_invites: invitation tokens for adding managers
create table public.registry_invites (
  id          uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.registries(id) on delete cascade,
  invited_by  uuid not null references public.profiles(id) on delete cascade,
  email       text,
  token       text not null unique,
  max_uses    int,
  use_count   int not null default 0,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

create index idx_registry_invites_token on public.registry_invites(token);
create index idx_registry_invites_registry_id on public.registry_invites(registry_id);

-- ============================================================================
-- 2. BACKFILL: Insert existing owners into registry_managers
-- ============================================================================

insert into public.registry_managers (registry_id, user_id, role)
select id, owner_id, 'owner'
from public.registries
on conflict do nothing;

-- ============================================================================
-- 3. TRIGGER: Auto-add owner to registry_managers on new registry
-- ============================================================================

create or replace function public.handle_new_registry_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.registry_managers (registry_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_registry_created
  after insert on public.registries
  for each row
  execute function public.handle_new_registry_owner();

-- ============================================================================
-- 4. HELPER: is_registry_manager(registry_id, user_id)
-- ============================================================================

create or replace function public.is_registry_manager(
  p_registry_id uuid,
  p_user_id     uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.registry_managers
     where registry_id = p_registry_id
       and user_id = p_user_id
  );
$$;

-- ============================================================================
-- 5. RLS ON NEW TABLES
-- ============================================================================

alter table public.registry_managers enable row level security;
alter table public.registry_invites  enable row level security;

-- registry_managers: managers can see co-managers of their registries
create policy "Managers can view registry managers"
  on public.registry_managers for select
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

-- registry_invites: managers can view invites for their registries
create policy "Managers can view registry invites"
  on public.registry_invites for select
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

-- ============================================================================
-- 6. UPDATE RLS POLICIES: Replace owner_id checks with is_registry_manager
-- ============================================================================

-- --------------------------------------------------------------------------
-- registries: update + select for managers (keep delete + insert owner-only)
-- --------------------------------------------------------------------------

drop policy if exists "Owners can view own registries" on public.registries;
create policy "Managers can view managed registries"
  on public.registries for select
  using (
    public.is_registry_manager(id, auth.uid())
  );

drop policy if exists "Owners can update own registries" on public.registries;
create policy "Managers can update managed registries"
  on public.registries for update
  using (
    public.is_registry_manager(id, auth.uid())
  )
  with check (
    public.is_registry_manager(id, auth.uid())
  );

-- NOTE: insert and delete policies stay owner-only (unchanged)

-- --------------------------------------------------------------------------
-- categories: all CRUD for managers
-- --------------------------------------------------------------------------

drop policy if exists "Owners can view own categories" on public.categories;
create policy "Managers can view categories"
  on public.categories for select
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can insert categories" on public.categories;
create policy "Managers can insert categories"
  on public.categories for insert
  with check (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can update own categories" on public.categories;
create policy "Managers can update categories"
  on public.categories for update
  using (
    public.is_registry_manager(registry_id, auth.uid())
  )
  with check (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can delete own categories" on public.categories;
create policy "Managers can delete categories"
  on public.categories for delete
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

-- --------------------------------------------------------------------------
-- registry_items: all CRUD for managers
-- --------------------------------------------------------------------------

drop policy if exists "Owners can view own items" on public.registry_items;
create policy "Managers can view items"
  on public.registry_items for select
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can insert items" on public.registry_items;
create policy "Managers can insert items"
  on public.registry_items for insert
  with check (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can update own items" on public.registry_items;
create policy "Managers can update items"
  on public.registry_items for update
  using (
    public.is_registry_manager(registry_id, auth.uid())
  )
  with check (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can delete own items" on public.registry_items;
create policy "Managers can delete items"
  on public.registry_items for delete
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

-- --------------------------------------------------------------------------
-- cash_funds: all CRUD for managers
-- --------------------------------------------------------------------------

drop policy if exists "Owners can view own cash funds" on public.cash_funds;
create policy "Managers can view cash funds"
  on public.cash_funds for select
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can insert cash funds" on public.cash_funds;
create policy "Managers can insert cash funds"
  on public.cash_funds for insert
  with check (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can update own cash funds" on public.cash_funds;
create policy "Managers can update cash funds"
  on public.cash_funds for update
  using (
    public.is_registry_manager(registry_id, auth.uid())
  )
  with check (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Owners can delete own cash funds" on public.cash_funds;
create policy "Managers can delete cash funds"
  on public.cash_funds for delete
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

-- --------------------------------------------------------------------------
-- purchases: select for managers
-- --------------------------------------------------------------------------

drop policy if exists "Owners can view purchases on own items" on public.purchases;
create policy "Managers can view purchases"
  on public.purchases for select
  using (
    exists (
      select 1 from public.registry_items
        join public.registries on registries.id = registry_items.registry_id
       where registry_items.id = purchases.registry_item_id
         and public.is_registry_manager(registries.id, auth.uid())
    )
    or
    exists (
      select 1 from public.cash_funds
        join public.registries on registries.id = cash_funds.registry_id
       where cash_funds.id = purchases.cash_fund_id
         and public.is_registry_manager(registries.id, auth.uid())
    )
  );

-- --------------------------------------------------------------------------
-- suggestions: select + update for managers
-- --------------------------------------------------------------------------

drop policy if exists "Registry owner can view suggestions" on public.suggestions;
create policy "Managers can view suggestions"
  on public.suggestions for select
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

drop policy if exists "Registry owner can update suggestions" on public.suggestions;
create policy "Managers can update suggestions"
  on public.suggestions for update
  using (
    public.is_registry_manager(registry_id, auth.uid())
  );

-- ============================================================================
-- 7. UPDATE RPC FUNCTIONS: Replace owner_id checks with is_registry_manager
-- ============================================================================

-- cancel_reservation: allow any manager (not just owner)
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
     and p.status = 'reserved'
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

-- mark_item_parent_purchased: allow any manager
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
  select ri.*
    into v_item
    from public.registry_items ri
    join public.registries r on r.id = ri.registry_id
   where ri.id = p_item_id
     and public.is_registry_manager(r.id, p_owner_id)
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
-- 8. NEW RPC: accept_registry_invite
-- ============================================================================

create or replace function public.accept_registry_invite(
  p_token   text,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_manager_id uuid;
begin
  -- Lock the invite row
  select *
    into v_invite
    from public.registry_invites
   where token = p_token
   for update;

  if v_invite is null then
    raise exception 'Invite not found';
  end if;

  -- Check expiry
  if v_invite.expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  -- Check max uses
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'This invite has been fully used';
  end if;

  -- For email invites, verify the user's email matches
  if v_invite.email is not null then
    if not exists (
      select 1 from auth.users
       where id = p_user_id
         and email = v_invite.email
    ) then
      raise exception 'This invite was sent to a different email address';
    end if;
  end if;

  -- Check if already a manager
  if exists (
    select 1 from public.registry_managers
     where registry_id = v_invite.registry_id
       and user_id = p_user_id
  ) then
    raise exception 'You are already a manager of this registry';
  end if;

  -- Add as manager
  insert into public.registry_managers (registry_id, user_id, role)
  values (v_invite.registry_id, p_user_id, 'manager')
  returning id into v_manager_id;

  -- Increment use count
  update public.registry_invites
     set use_count = use_count + 1
   where id = v_invite.id;

  return v_manager_id;
end;
$$;
