-- ============================================================================
-- RSVP questions and messages to guests (#100)
-- ============================================================================
-- What this adds:
--
-- 1. events.rsvp_questions: what the host asks besides how many are coming.
--    A list of {id, kind, label, required, options}, where kind is meal,
--    diet, plus_ones or text (src/lib/rsvp-questions.ts checks the shape).
-- 2. event_guests.answers: each guest's answers, by question id.
-- 3. events.remind_day_before: email everyone going a reminder the day
--    before. On by default, like Luma. events.reminded_for is the event date
--    the last reminder went out for, so the daily job sends one per date,
--    and again if the host moves the event.
-- 4. event_messages: what the host emailed guests and when: messages the
--    host wrote, the automatic email when the date, time or place changes,
--    and the day-before reminder. The host's page lists them, and the server
--    uses them to keep a host from sending too many.
--
-- Like the other event tables, event_messages has RLS on with no policies and
-- no grants, so only the server reaches it.
--
-- Run this before deploying the code that uses it. It only adds things, so
-- the live code keeps working.

begin;

alter table public.events
  add column rsvp_questions    jsonb not null default '[]'::jsonb
                               check (jsonb_typeof(rsvp_questions) = 'array'),
  add column remind_day_before boolean not null default true,
  add column reminded_for      date;

alter table public.event_guests
  add column answers jsonb not null default '{}'::jsonb
                     check (jsonb_typeof(answers) = 'object');

create table public.event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  -- Null for the automatic reminder, and once the sender's account is gone.
  sent_by    uuid references public.profiles(id) on delete set null,
  kind       text not null check (kind in ('message', 'change', 'reminder')),
  -- Who it went to: 'going' (yes), 'going_maybe' (yes and maybe) or
  -- 'not_declined' (everyone on the list who hasn't said no).
  audience   text not null check (audience in ('going', 'going_maybe', 'not_declined')),
  subject    text not null check (char_length(subject) between 1 and 150),
  body       text check (char_length(body) <= 5000),
  recipients smallint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_event_messages_event_id on public.event_messages(event_id, created_at desc);

alter table public.event_messages enable row level security;
revoke all on public.event_messages from anon, authenticated;

-- The daily job looks for events a day or two away that still want a reminder.
create index idx_events_reminder_due
  on public.events(event_date)
  where remind_day_before and event_date is not null;

commit;
