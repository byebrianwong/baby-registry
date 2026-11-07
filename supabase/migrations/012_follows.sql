-- ============================================================================
-- Follows, with approval
-- ============================================================================
-- People follow each other's profiles. Every follow starts as a request, and
-- the person being followed approves or declines it (declining deletes it).
--
-- "Private" now means hidden from search engines, and shown on a profile only
-- to approved followers. Anyone with a registry's share link can still open it,
-- so guests can keep giving gifts without an account. Public registries stay
-- visible to anyone who opens the profile.
--
-- The app reads and writes this table only on the server, with the
-- service-role client after its own checks, the same way the public registry
-- page reads registries since 009. RLS is on with no policies and the API roles
-- have no grants, so it can't be reached through the Data API at all.
--
-- Run this BEFORE deploying the app code that reads it. The code that's
-- currently deployed doesn't use this table, and only ever lists public
-- registries, so dropping the check below doesn't affect it.

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'approved')),
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

-- The primary key covers lookups by follower. This covers someone's requests
-- and followers.
create index idx_follows_followee on public.follows(followee_id, status);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;

-- Private registries can now be listed; only approved followers see them.
alter table public.registries
  drop constraint registries_listed_requires_public;
