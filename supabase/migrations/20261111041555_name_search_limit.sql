-- ============================================================================
-- Cap how many name searches one account makes in an hour
-- ============================================================================
-- People search by name returns up to 10 findable profiles a time. With no cap,
-- one account could try name after name and list everyone who's findable.
-- 017 already caps email lookups with email_searches. This table does the
-- same for name searches, and the app allows 100 an hour. Searching runs as
-- you type, so one person looking for a few friends uses a few dozen at most.
--
-- Server only, like email_searches: the app reads and writes it with the
-- service-role client.
--
-- Safe to run before or after deploying the app code. Until this table
-- exists, the app can't count name searches, so it doesn't limit them.
--
-- Safe to run more than once.

begin;

create table if not exists public.name_searches (
  searcher_id uuid not null references public.profiles(id) on delete cascade,
  searched_at timestamptz not null default now()
);

create index if not exists idx_name_searches_searcher
  on public.name_searches(searcher_id, searched_at);

alter table public.name_searches enable row level security;
revoke all on public.name_searches from anon, authenticated;

commit;
