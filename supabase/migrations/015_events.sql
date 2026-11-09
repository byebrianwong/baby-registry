-- ============================================================================
-- Events: invitations, guest lists and RSVPs
-- ============================================================================
-- A host plans an event (a baby shower, a birthday, a Christmas party and so
-- on), uploads a picture as the invitation, adds guests and emails them. Guests
-- open the event page (/e/<slug>) and RSVP without an account. An event can
-- link to one of the host's registries, and its page links guests there.
--
-- Who can manage an event: its owner, and the managers of the registry it
-- links to. Only the owner can delete it. The server checks this
-- (src/lib/actions/events.ts) before every read and write.
--
-- Both tables are only reachable from the server, like `follows`: RLS is on
-- with no policies and the API roles have no grants. Guest lists hold names,
-- emails and personal RSVP links, and the event holds the host's address, so
-- none of it is readable with the public anon key. The event page reads them
-- with the service-role client, filtered by slug, and RSVP links are checked
-- by their token.
--
-- Invitation pictures go in a public bucket, in a folder named for the event:
--   event-images/<event id>/<random id>.jpg
-- Public, because the event page and the invitation email show them to guests.
-- The random file names keep them from being guessed. Only people who can
-- manage an event can upload to its folder.
--
-- This only adds things. The deployed code doesn't use any of it, so it can
-- run before or after the code that does. Run it before anyone uses events.

-- --------------------------------------------------------------------------
-- 1. Events
-- --------------------------------------------------------------------------

create table public.events (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles(id) on delete cascade,
  -- Unlinking happens on its own when the registry is deleted.
  registry_id        uuid references public.registries(id) on delete set null,
  slug               text not null unique,
  event_type         text not null default 'other'
                     check (event_type in (
                       'baby_shower',
                       'bridal_shower',
                       'wedding',
                       'engagement',
                       'birthday',
                       'christmas',
                       'housewarming',
                       'graduation',
                       'other'
                     )),
  title              text not null check (char_length(title) between 1 and 120),
  hosted_by          text check (char_length(hosted_by) <= 120),
  -- The day and times as the host typed them, in the event's own time zone
  -- (an IANA name such as America/Los_Angeles). Guests see them unconverted,
  -- like a paper invitation. The calendar links convert them.
  event_date         date,
  start_time         time,
  end_time           time,
  time_zone          text check (char_length(time_zone) <= 64),
  location_name      text check (char_length(location_name) <= 120),
  location_address   text check (char_length(location_address) <= 300),
  message            text check (char_length(message) <= 2000),
  image_url          text,
  rsvp_by            date,
  -- How many people one RSVP can count, the guest included.
  max_party_size     smallint not null default 2 check (max_party_size between 1 and 20),
  -- When on, anyone with the event link can add themselves to the guest list
  -- by RSVPing. When off, only guests with a personal link can RSVP.
  open_rsvp          boolean not null default true,
  email_host_on_rsvp boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_events_owner_id on public.events(owner_id);
create index idx_events_registry_id on public.events(registry_id);

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Guests
-- --------------------------------------------------------------------------

create table public.event_guests (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 100),
  -- Optional: a host can add someone they'll text the link to instead.
  email          text check (char_length(email) <= 254),
  -- The secret in the guest's personal RSVP link (/e/<slug>?g=<token>).
  token          text not null unique,
  rsvp_status    text not null default 'pending'
                 check (rsvp_status in ('pending', 'yes', 'no', 'maybe')),
  -- How many people are coming, the guest included. 0 for a "no".
  party_size     smallint not null default 1 check (party_size between 0 and 20),
  rsvp_note      text check (char_length(rsvp_note) <= 1000),
  responded_at   timestamptz,
  -- When the invitation and the last reminder were emailed.
  invited_at     timestamptz,
  reminded_at    timestamptz,
  -- True when the guest added themselves by RSVPing from the event link.
  added_by_guest boolean not null default false,
  created_at     timestamptz not null default now()
);

create index idx_event_guests_event_id on public.event_guests(event_id);

-- One guest per email address on each event. RSVPing from the event link with
-- an address that's already on the list asks the guest to use their own link.
create unique index event_guests_event_email_key
  on public.event_guests(event_id, lower(email))
  where email is not null;

alter table public.event_guests enable row level security;
revoke all on public.event_guests from anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Who can manage an event
-- --------------------------------------------------------------------------

-- Whether the signed-in user can manage the event: its owner, or a manager of
-- the registry it links to. Checks the caller's own id, so it can't be used to
-- ask about anyone else. The storage rule below calls it.
create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.events e
     where e.id = p_event_id
       and (
         e.owner_id = (select auth.uid())
         or exists (
           select 1
             from public.registry_managers m
            where m.registry_id = e.registry_id
              and m.user_id = (select auth.uid())
         )
       )
  );
$$;

revoke execute on function public.can_manage_event(uuid) from public, anon;
grant execute on function public.can_manage_event(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 4. Invitation pictures
-- --------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  5242880, -- 5 MB. The site shrinks pictures before upload, so most are far smaller.
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Event managers can upload event images" on storage.objects;
create policy "Event managers can upload event images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and public.can_manage_event(
      -- The first folder is the event id. The case turns anything that isn't
      -- a uuid into null, which no event matches, instead of a cast error.
      case
        when (storage.foldername(name))[1]
          ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
      end
    )
  );
