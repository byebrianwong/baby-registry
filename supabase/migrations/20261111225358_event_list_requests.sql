-- ============================================================================
-- Asking the person an event is for to make a gift list
-- ============================================================================
-- Someone throwing a baby shower for a friend can ask the friend to make a
-- registry. Regibee emails the friend a link (/list-request/<token>). When
-- they open it and make their list, it's linked to the event straight away.
--
-- One row per request. registry_id and fulfilled_at are set once the list
-- exists. Like the other event tables: RLS on with no policies and no grants,
-- so only the server reaches it, with the service-role client after its own
-- checks.
--
-- It only adds a table, so it can run before or after the code that uses it
-- is deployed. Run it before, so the new option works as soon as it ships.

begin;

create table public.event_list_requests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  -- Who the list is for, as the host typed them.
  name         text not null check (char_length(name) between 1 and 100),
  email        text not null check (char_length(email) <= 254),
  -- The secret in the emailed link.
  token        text not null unique,
  -- The list they made, once they have.
  registry_id  uuid references public.registries(id) on delete set null,
  created_at   timestamptz not null default now(),
  fulfilled_at timestamptz
);

create index idx_event_list_requests_event_id on public.event_list_requests(event_id);
create index idx_event_list_requests_registry_id on public.event_list_requests(registry_id) where registry_id is not null;

-- One request per person on each event.
create unique index event_list_requests_event_email_key
  on public.event_list_requests(event_id, lower(email));

alter table public.event_list_requests enable row level security;
revoke all on public.event_list_requests from anon, authenticated;

commit;
