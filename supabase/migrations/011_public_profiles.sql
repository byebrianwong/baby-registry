-- ============================================================================
-- Optional public profiles
-- ============================================================================
-- A profile becomes public only when its owner claims a username, so accounts
-- stay invisible until they opt in. Guests have rows in this table too, because
-- the signup trigger also runs for the anonymous sessions created when someone
-- reserves a gift. They can't claim a username, so they never get a profile.
--
-- Registries appear on a profile only when `listed_on_profile` is on. It starts
-- off for every existing registry: "Public" only ever promised search engine
-- visibility, not being listed under the owner's name.
--
-- Run this BEFORE deploying the app code that reads these columns. It's
-- additive, so the code that's currently deployed keeps working.

-- 3-30 characters: lowercase letters, numbers and hyphens, with no hyphen at
-- either end. Mirrored in src/lib/username.ts.
alter table public.profiles
  add column username text unique
    constraint profiles_username_format
      check (username ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');

-- "Users can update own profile" covers every column, which would let any
-- session, anonymous ones included, set a username through the API. Usernames
-- are set only by the saveProfile server action, which rejects anonymous
-- sessions.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

alter table public.registries
  add column listed_on_profile boolean not null default false,
  add constraint registries_listed_requires_public
    check (not listed_on_profile or is_public);

create index idx_registries_listed_by_owner
  on public.registries(owner_id)
  where listed_on_profile;

-- "Managers can update managed registries" covers every column too. A listed
-- registry appears under its owner's name, so managers must not be able to list
-- a registry for its owner, or reassign one onto someone else's profile.
create or replace function public.guard_registry_owner_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  -- No caller means the service role, which server actions use after making
  -- their own checks. Other sessionless requests can't reach this row, because
  -- the update policy needs a signed-in manager.
  if caller is null then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Registry ownership cannot be changed'
      using errcode = '42501';
  end if;

  if new.listed_on_profile and not old.listed_on_profile and caller <> old.owner_id then
    raise exception 'Only the registry owner can show it on their profile'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger guard_registry_owner_fields
  before update on public.registries
  for each row execute function public.guard_registry_owner_fields();
