-- ============================================================================
-- Baby Registry App - Initial Schema Migration
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  role       text not null default 'parent',
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- registries
-- --------------------------------------------------------------------------
create table public.registries (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  slug        text not null unique,
  event_date  date,
  is_public   boolean not null default true,
  description text,
  photo_url   text,
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- categories
-- --------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.registries(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- registry_items
-- --------------------------------------------------------------------------
create table public.registry_items (
  id                 uuid primary key default gen_random_uuid(),
  registry_id        uuid not null references public.registries(id) on delete cascade,
  category_id        uuid references public.categories(id) on delete set null,
  title              text not null,
  external_url       text,
  image_url          text,
  price              decimal,
  quantity_needed    int not null default 1,
  quantity_fulfilled int not null default 0,
  is_essential       boolean not null default false,
  notes              text,
  sort_order         int not null default 0,
  version            int not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- cash_funds
-- --------------------------------------------------------------------------
create table public.cash_funds (
  id             uuid primary key default gen_random_uuid(),
  registry_id    uuid not null references public.registries(id) on delete cascade,
  title          text not null,
  description    text,
  goal_amount    decimal,
  current_amount decimal not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- purchases
-- --------------------------------------------------------------------------
create table public.purchases (
  id               uuid primary key default gen_random_uuid(),
  registry_item_id uuid references public.registry_items(id) on delete set null,
  cash_fund_id     uuid references public.cash_funds(id) on delete set null,
  buyer_name       text not null,
  buyer_email      text,
  quantity         int not null default 1,
  amount           decimal,
  status           text not null default 'reserved'
                   check (status in ('reserved', 'purchased', 'cancelled')),
  message          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index idx_registries_owner_id    on public.registries(owner_id);
create index idx_registries_slug        on public.registries(slug);
create index idx_categories_registry_id on public.categories(registry_id);
create index idx_registry_items_registry_id on public.registry_items(registry_id);
create index idx_registry_items_category_id on public.registry_items(category_id);
create index idx_cash_funds_registry_id on public.cash_funds(registry_id);
create index idx_purchases_registry_item_id on public.purchases(registry_item_id);
create index idx_purchases_cash_fund_id     on public.purchases(cash_fund_id);

-- ============================================================================
-- 3. TRIGGER: auto-create profile on auth.users insert
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- 4. TRIGGER: auto-update updated_at columns
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_registries_updated_at
  before update on public.registries
  for each row execute function public.set_updated_at();

create trigger set_registry_items_updated_at
  before update on public.registry_items
  for each row execute function public.set_updated_at();

create trigger set_cash_funds_updated_at
  before update on public.cash_funds
  for each row execute function public.set_updated_at();

create trigger set_purchases_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. RPC: reserve_registry_item (with SELECT FOR UPDATE concurrency control)
-- ============================================================================

create or replace function public.reserve_registry_item(
  p_item_id       uuid,
  p_buyer_name    text,
  p_buyer_email   text default null,
  p_quantity      int  default 1,
  p_message       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available  int;
  v_purchase_id uuid;
begin
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

  -- Update the fulfilled count and bump version
  update public.registry_items
     set quantity_fulfilled = quantity_fulfilled + p_quantity,
         version = version + 1,
         updated_at = now()
   where id = p_item_id;

  -- Create the purchase record
  insert into public.purchases (registry_item_id, buyer_name, buyer_email, quantity, status, message)
  values (p_item_id, p_buyer_name, p_buyer_email, p_quantity, 'reserved', p_message)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

-- ============================================================================
-- 6. RPC: reserve_cash_fund (with SELECT FOR UPDATE concurrency control)
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
set search_path = public
as $$
declare
  v_goal      decimal;
  v_current   decimal;
  v_purchase_id uuid;
begin
  -- Lock the row to prevent concurrent over-contribution
  select goal_amount, current_amount
    into v_goal, v_current
    from public.cash_funds
   where id = p_fund_id
   for update;

  if v_current is null then
    raise exception 'Cash fund not found';
  end if;

  -- If there is a goal, ensure we do not exceed it
  if v_goal is not null and (v_current + p_amount) > v_goal then
    raise exception 'Contribution exceeds fund goal. Goal: %, Current: %, Attempted: %', v_goal, v_current, p_amount;
  end if;

  -- Update the current amount
  update public.cash_funds
     set current_amount = current_amount + p_amount,
         updated_at = now()
   where id = p_fund_id;

  -- Create the purchase record
  insert into public.purchases (cash_fund_id, buyer_name, buyer_email, amount, status, message)
  values (p_fund_id, p_buyer_name, p_buyer_email, p_amount, 'reserved', p_message)
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.registries     enable row level security;
alter table public.categories     enable row level security;
alter table public.registry_items enable row level security;
alter table public.cash_funds     enable row level security;
alter table public.purchases      enable row level security;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow insert via the trigger (security definer)
-- No direct insert policy needed since handle_new_user() is security definer

-- --------------------------------------------------------------------------
-- registries
-- --------------------------------------------------------------------------

-- Anyone can view public registries
create policy "Public registries are viewable by anyone"
  on public.registries for select
  using (is_public = true);

-- Owners can view all their own registries (including private)
create policy "Owners can view own registries"
  on public.registries for select
  using (auth.uid() = owner_id);

-- Owners can insert registries
create policy "Owners can insert registries"
  on public.registries for insert
  with check (auth.uid() = owner_id);

-- Owners can update their registries
create policy "Owners can update own registries"
  on public.registries for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Owners can delete their registries
create policy "Owners can delete own registries"
  on public.registries for delete
  using (auth.uid() = owner_id);

-- --------------------------------------------------------------------------
-- categories
-- --------------------------------------------------------------------------

-- Anyone can view categories for public registries
create policy "Categories viewable on public registries"
  on public.categories for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
         and registries.is_public = true
    )
  );

-- Owners can view categories on their own registries
create policy "Owners can view own categories"
  on public.categories for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can insert categories
create policy "Owners can insert categories"
  on public.categories for insert
  with check (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can update categories
create policy "Owners can update own categories"
  on public.categories for update
  using (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
         and registries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can delete categories
create policy "Owners can delete own categories"
  on public.categories for delete
  using (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- registry_items
-- --------------------------------------------------------------------------

-- Anyone can view items on public registries
create policy "Items viewable on public registries"
  on public.registry_items for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
         and registries.is_public = true
    )
  );

-- Owners can view items on their own registries
create policy "Owners can view own items"
  on public.registry_items for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can insert items
create policy "Owners can insert items"
  on public.registry_items for insert
  with check (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can update items
create policy "Owners can update own items"
  on public.registry_items for update
  using (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
         and registries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can delete items
create policy "Owners can delete own items"
  on public.registry_items for delete
  using (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- cash_funds
-- --------------------------------------------------------------------------

-- Anyone can view cash funds on public registries
create policy "Cash funds viewable on public registries"
  on public.cash_funds for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
         and registries.is_public = true
    )
  );

-- Owners can view cash funds on their own registries
create policy "Owners can view own cash funds"
  on public.cash_funds for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can insert cash funds
create policy "Owners can insert cash funds"
  on public.cash_funds for insert
  with check (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can update cash funds
create policy "Owners can update own cash funds"
  on public.cash_funds for update
  using (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
         and registries.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- Owners can delete cash funds
create policy "Owners can delete own cash funds"
  on public.cash_funds for delete
  using (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
         and registries.owner_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- purchases
-- --------------------------------------------------------------------------

-- Owners can view purchases on their registry items
create policy "Owners can view purchases on own items"
  on public.purchases for select
  using (
    exists (
      select 1 from public.registry_items
        join public.registries on registries.id = registry_items.registry_id
       where registry_items.id = purchases.registry_item_id
         and registries.owner_id = auth.uid()
    )
    or
    exists (
      select 1 from public.cash_funds
        join public.registries on registries.id = cash_funds.registry_id
       where cash_funds.id = purchases.cash_fund_id
         and registries.owner_id = auth.uid()
    )
  );

-- Purchases are inserted via the security-definer RPC functions
-- (reserve_registry_item and reserve_cash_fund), so no direct insert
-- policy is required. The RPC functions bypass RLS because they are
-- declared as security definer.

-- ============================================================================
-- 9. ENABLE REALTIME
-- ============================================================================

alter publication supabase_realtime add table public.registry_items;
alter publication supabase_realtime add table public.purchases;
