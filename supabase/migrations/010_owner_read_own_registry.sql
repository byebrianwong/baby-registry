-- Let owners read their own registry row.
--
-- 009_restrict_registry_reads.sql removed the "anyone can read" policy on
-- registries. The only SELECT policy left, "Managers can view managed
-- registries", checks registry_managers. createRegistry in
-- src/lib/actions/registry.ts inserts and asks for the new row back, and
-- Postgres checks SELECT policies on a new row before the AFTER INSERT trigger
-- (on_registry_created) adds the owner to registry_managers. Without this
-- policy, creating a registry fails with "new row violates row-level security
-- policy for table registries".
--
-- Run this in the same transaction as 009. Both were applied to production
-- together on 2026-11-01.

create policy "Owners can view own registries"
  on public.registries for select
  to authenticated
  using ((select auth.uid()) = owner_id);
