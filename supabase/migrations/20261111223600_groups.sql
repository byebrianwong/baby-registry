-- ============================================================================
-- Groups: saved guest lists that last
-- ============================================================================
-- A group is a list of people someone keeps, like "the Chens" or "Book club".
-- Its owner can fill an event's guest list from it, run the yearly gift
-- exchange inside it, and share a wishlist with it.
--
-- What this adds:
--
-- 1. groups: one row per group, with its owner and name.
-- 2. group_members: the people in a group. Each is a name and an optional
--    email, like an event guest. profile_id is set when a member is known to
--    be a Regibee account. Members are also matched to accounts by email.
-- 3. registry_groups: wishlists shared with a group. People in the group who
--    have an account see them on their Following page, as approved followers
--    do, even when the list is private.
-- 4. events.group_id: the group an event's guests came from. A gift exchange
--    started from a group points to it, so next year's exchange can avoid
--    this year's pairs.
--
-- Every new table is like events: RLS on with no policies and no grants, so
-- only the server reaches it, with the service-role client after its own
-- checks.
--
-- It only adds things, so it can run before or after the code that uses it
-- is deployed. Run it before, so the new pages work as soon as they ship.

begin;

-- --------------------------------------------------------------------------
-- 1. Groups
-- --------------------------------------------------------------------------

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_groups_owner_id on public.groups(owner_id);

create trigger set_groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

alter table public.groups enable row level security;
revoke all on public.groups from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Group members
-- --------------------------------------------------------------------------

create table public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name       text not null check (char_length(name) between 1 and 100),
  email      text check (char_length(email) <= 254),
  created_at timestamptz not null default now()
);

create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_profile_id on public.group_members(profile_id) where profile_id is not null;

-- One member per email address in each group, as on an event's guest list.
create unique index group_members_group_email_key
  on public.group_members(group_id, lower(email))
  where email is not null;

-- Finds the groups an account is in by its email, for the Following page.
create index idx_group_members_email on public.group_members(lower(email)) where email is not null;

alter table public.group_members enable row level security;
revoke all on public.group_members from anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Wishlists shared with a group
-- --------------------------------------------------------------------------

create table public.registry_groups (
  registry_id uuid not null references public.registries(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  shared_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (registry_id, group_id)
);

create index idx_registry_groups_group_id on public.registry_groups(group_id);

alter table public.registry_groups enable row level security;
revoke all on public.registry_groups from anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. The group an event came from
-- --------------------------------------------------------------------------

alter table public.events
  add column group_id uuid references public.groups(id) on delete set null;

create index idx_events_group_id on public.events(group_id) where group_id is not null;

commit;
