-- ============================================================================
-- Add registry_type and event_type to registries
-- ============================================================================
-- Opens Regibee up to non-baby registries. `registry_type` partitions the
-- experience (baby vs. personal); `event_type` is an optional sub-type for
-- personal registries so UI copy can specialize (birthday, christmas, etc.).
--
-- Also introduces `honoree_names` as a type-neutral replacement for
-- `parent_names`. We keep `parent_names` for one release to avoid breaking
-- the existing settings UI and emails; new code should read `honoree_names`
-- with a fallback to `parent_names`.

alter table public.registries
  add column registry_type text not null default 'baby'
    check (registry_type in ('baby', 'personal')),
  add column event_type text
    check (
      event_type is null
      or event_type in (
        'birthday',
        'christmas',
        'wedding',
        'housewarming',
        'graduation',
        'other'
      )
    ),
  add column honoree_names text;

-- Only personal registries can carry an event_type.
alter table public.registries
  add constraint registries_event_type_requires_personal
    check (event_type is null or registry_type = 'personal');

-- Backfill honoree_names from parent_names for existing rows so the new
-- column is immediately usable by downstream code.
update public.registries
   set honoree_names = parent_names
 where parent_names is not null
   and honoree_names is null;

create index idx_registries_registry_type on public.registries(registry_type);
