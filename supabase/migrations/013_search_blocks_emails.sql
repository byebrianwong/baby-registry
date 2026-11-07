-- ============================================================================
-- People search, blocking, and follow-request emails
-- ============================================================================
-- Like `follows`, the two new tables are only reachable from the server: RLS
-- is on with no policies and the API roles have no grants. The new profile
-- columns are written by server actions with the service-role client.
--
-- Run this BEFORE deploying the app code that reads it. The code that's
-- currently deployed doesn't use any of it.

-- Profiles were only reachable by link until now, so existing ones stay out of
-- search until their owner turns it on. New profiles opt in when they're
-- claimed, with a checkbox that starts ticked.
alter table public.profiles
  add column discoverable boolean not null default false,
  add column email_follow_requests boolean not null default true;

-- A block removes any follow between the two people (the server action does
-- that), stops new follow requests and their emails, and hides the blocker's
-- profile and search result from the blocked person while they're signed in.
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;

-- When each follower last triggered a request email to each person. A declined
-- request is deleted from `follows`, so this lives separately: asking again
-- right away can't send another email.
create table public.follow_request_emails (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  sent_at     timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

alter table public.follow_request_emails enable row level security;
revoke all on public.follow_request_emails from anon, authenticated;
