-- ============================================================================
-- Add parent_names to registries
-- ============================================================================
-- A registry-level display name for the parents/managers (e.g. "Remi & Max").
-- Used in the public registry page, buyer-facing emails, and owner notifications
-- instead of looking up a single owner's profile name.

alter table public.registries
  add column parent_names text;
