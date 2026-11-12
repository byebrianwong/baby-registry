-- ============================================================================
-- Drop events.registry_id and the trigger that copied it (#95)
-- ============================================================================
-- Since 20261111103947_event_hosts_lists_and_gift_exchanges.sql, an event's
-- registries live in event_registries. events.registry_id stayed only because
-- the code deployed before that still wrote it, and the
-- copy_event_registry_link trigger copied those writes into event_registries.
-- No code reads or writes the column now.
--
-- Run this AFTER deploying the code from the same pull request. The code
-- before it still names the column in one update, which would fail once the
-- column is gone.
--
-- Nothing is copied first. The earlier migration copied every link, and the
-- trigger copied every write since. A value still in the column can be a
-- registry the host unlinked on the event form, which never cleared the old
-- column, so copying it again would bring that link back.

begin;

drop trigger if exists copy_event_registry_link on public.events;
drop function if exists public.copy_event_registry_link();
drop index if exists public.idx_events_registry_id;
alter table public.events drop column if exists registry_id;

commit;
