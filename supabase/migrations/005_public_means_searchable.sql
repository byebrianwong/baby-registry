-- Change is_public from an access gate to a discoverability toggle.
-- All registries are now accessible via their slug link.
-- is_public only controls whether search engines can index the registry.

-- registries: allow anyone to view any registry (not just public ones)
drop policy "Public registries are viewable by anyone" on public.registries;
create policy "Registries are viewable by anyone via slug"
  on public.registries for select
  using (true);

-- categories: allow anyone to view categories for any registry
drop policy "Categories viewable on public registries" on public.categories;
create policy "Categories viewable on any registry"
  on public.categories for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = categories.registry_id
    )
  );

-- registry_items: allow anyone to view items for any registry
drop policy "Items viewable on public registries" on public.registry_items;
create policy "Items viewable on any registry"
  on public.registry_items for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = registry_items.registry_id
    )
  );

-- cash_funds: allow anyone to view cash funds for any registry
drop policy "Cash funds viewable on public registries" on public.cash_funds;
create policy "Cash funds viewable on any registry"
  on public.cash_funds for select
  using (
    exists (
      select 1 from public.registries
       where registries.id = cash_funds.registry_id
    )
  );
