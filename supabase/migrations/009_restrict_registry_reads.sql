-- Remove the "anyone can read" policies added in 005_public_means_searchable.sql.
--
-- Those policies used `using (true)`, so any client holding the public anon key
-- could query the REST API directly and list every registry, including
-- settings.shipping_address and settings.payment_methods, plus every registry's
-- categories, items and cash funds.
--
-- The public registry page (src/app/r/[slug]/page.tsx) now reads these tables
-- on the server with the service-role client, filtered by slug. Gift-giver
-- actions already go through security definer functions or the service-role
-- client. Owners and managers keep access through the policies in
-- 001_initial_schema.sql and 006_multi_manager.sql.
--
-- Deploy the app code that includes the page change BEFORE running this
-- migration. Otherwise the public registry page will return 404.

drop policy if exists "Registries are viewable by anyone via slug" on public.registries;
drop policy if exists "Categories viewable on any registry" on public.categories;
drop policy if exists "Items viewable on any registry" on public.registry_items;
drop policy if exists "Cash funds viewable on any registry" on public.cash_funds;
