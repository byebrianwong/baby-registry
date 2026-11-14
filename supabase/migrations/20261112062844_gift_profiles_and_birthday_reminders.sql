-- ============================================================================
-- Gift profiles and birthday reminders
-- ============================================================================
-- What this adds:
--
-- 1. profiles.gift_profile: what someone would like, for the people who give
--    them gifts. A birthday (month and day, no year), sizes, favorite colors,
--    likes, things to skip and notes, as a JSON object. src/lib/gift-profile.ts
--    reads and cleans it. Sizes, likes and the rest show on the owner's
--    personal wish lists and profile page. The birthday shows only to the
--    owner and their approved followers.
--
--    A list kept for a child has its own gift profile in
--    registries.settings.gift_profile, so it needs no column.
--
-- 2. profiles.email_birthday_reminders: the Account page switch for the email
--    sent 10 days before the birthday of someone you follow. On by default.
--
-- 3. reminder_log: one row per reminder email sent, so the daily job never
--    sends one twice. Like follows, only the server reaches it: RLS is on
--    with no policies and the API roles have no grants. Other reminder emails
--    can use it with their own `kind`, so it's created only if it isn't there.
--
-- Signed-in sessions can update only full_name and avatar_url on profiles
-- (011_public_profiles.sql), and that stays so. The app writes both new
-- columns with the service-role client, after checking who's asking and
-- refusing guest sessions.
--
-- It only adds things, so the code that's deployed now keeps working. Run it
-- BEFORE deploying the code that reads these columns.

begin;

-- --------------------------------------------------------------------------
-- 1 and 2. Profile columns
-- --------------------------------------------------------------------------

-- A constant default, so adding these doesn't rewrite the table.
alter table public.profiles
  add column gift_profile jsonb not null default '{}'::jsonb
    constraint profiles_gift_profile_is_object check (jsonb_typeof(gift_profile) = 'object'),
  add column email_birthday_reminders boolean not null default true;

-- --------------------------------------------------------------------------
-- 3. Reminder log
-- --------------------------------------------------------------------------

-- `kind` is what was sent, like 'birthday'. `subject_key` is what it was
-- about, like '<profile id>:<birthday date>'. The date has its year, so next
-- year's birthday gets its own row.
create table if not exists public.reminder_log (
  kind        text not null,
  subject_key text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sent_at     timestamptz not null default now(),
  primary key (kind, subject_key, user_id)
);

-- Deleting an account deletes its rows, and the job clears out old ones.
create index if not exists idx_reminder_log_user on public.reminder_log(user_id);
create index if not exists idx_reminder_log_sent on public.reminder_log(kind, sent_at);

alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from anon, authenticated;

commit;
