-- ============================================================================
-- Sign-up sheets on events: potlucks, meal trains, volunteer slots (#99)
-- ============================================================================
-- What this adds:
--
-- 1. signup_sheets: one per event, when the host turns it on. A title
--    ("Bring a dish", "Meals") and a note for guests.
-- 2. signup_items: the rows. Each has a label, how many people are needed,
--    and an optional date: "Sides, 3 needed", "Tue Nov 18, dinner, 1 needed".
-- 3. signup_claims: who took a spot. One spot per guest per row, with an
--    optional note ("Mac and cheese"). A claim belongs to a guest on the
--    event's guest list, so it shows with their RSVP.
-- 4. save_signup_claims: sets a guest's claims in one go. It locks each row
--    being claimed (select ... for update), like reserve_registry_item does
--    for gifts, so two guests can't both take the last spot.
-- 5. Two new occasions: potluck and meal_train. A meal train shows its
--    drop-off address only to guests who signed up (src/lib/signups.ts).
--
-- Every new table is like events: RLS on with no policies and no grants, so
-- only the server reaches it, with the service-role client after its own
-- checks. Guests have no account; the server finds them by their RSVP token.
--
-- Run this before deploying the code that uses it. It only adds things and
-- widens the event type check, so the live code keeps working.

begin;

-- --------------------------------------------------------------------------
-- 1. Sheets
-- --------------------------------------------------------------------------

create table public.signup_sheets (
  event_id   uuid primary key references public.events(id) on delete cascade,
  title      text not null default 'Sign-up sheet' check (char_length(title) between 1 and 80),
  -- Shown to guests above the rows: "Label your dish so people know what's in it."
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_signup_sheets_updated_at
  before update on public.signup_sheets
  for each row execute function public.set_updated_at();

alter table public.signup_sheets enable row level security;
revoke all on public.signup_sheets from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Rows
-- --------------------------------------------------------------------------

create table public.signup_items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.signup_sheets(event_id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 100),
  -- For a meal train or a volunteer shift. Null for "Sides".
  slot_date  date,
  needed     smallint not null default 1 check (needed between 1 and 50),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index idx_signup_items_event_id on public.signup_items(event_id);

alter table public.signup_items enable row level security;
revoke all on public.signup_items from anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Claims
-- --------------------------------------------------------------------------

create table public.signup_claims (
  item_id    uuid not null references public.signup_items(id) on delete cascade,
  guest_id   uuid not null references public.event_guests(id) on delete cascade,
  -- What they're bringing: "Mac and cheese", "Lasagna, no nuts".
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (item_id, guest_id)
);

create index idx_signup_claims_guest_id on public.signup_claims(guest_id);

alter table public.signup_claims enable row level security;
revoke all on public.signup_claims from anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Saving a guest's claims
-- --------------------------------------------------------------------------

-- Makes the guest's claims on the event's sheet match p_claims, a JSON array
-- of {"item_id": "...", "note": "..."}. Rows not in the array are released.
--
-- Returns null when it saved, or the id of a row that's already full, in
-- which case nothing changed. Every row being newly claimed is locked first,
-- in id order so two calls can't deadlock, and its claims are counted only
-- after the lock is held. A second guest going for the same last spot waits
-- for the first to finish, then sees the spot taken.
create or replace function public.save_signup_claims(
  p_event_id uuid,
  p_guest_id uuid,
  p_claims   jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids    uuid[];
  v_item   record;
  v_taken  int;
begin
  if not exists (
    select 1 from public.event_guests where id = p_guest_id and event_id = p_event_id
  ) then
    raise exception 'Guest not found';
  end if;

  if p_claims is null or jsonb_typeof(p_claims) <> 'array' then
    raise exception 'Claims must be a list';
  end if;

  select coalesce(array_agg(distinct (c ->> 'item_id')::uuid), '{}')
    into v_ids
    from jsonb_array_elements(p_claims) c;

  if (select count(*) from public.signup_items where id = any(v_ids) and event_id = p_event_id)
     <> coalesce(array_length(v_ids, 1), 0) then
    raise exception 'Sign-up row not found';
  end if;

  -- Lock the rows being newly claimed, then check each has a spot left.
  for v_item in
    select i.id, i.needed
      from public.signup_items i
     where i.id = any(v_ids)
       and not exists (
         select 1 from public.signup_claims c where c.item_id = i.id and c.guest_id = p_guest_id
       )
     order by i.id
       for update
  loop
    select count(*) into v_taken from public.signup_claims where item_id = v_item.id;
    if v_taken >= v_item.needed then
      return v_item.id;
    end if;
  end loop;

  delete from public.signup_claims c
   using public.signup_items i
   where c.item_id = i.id
     and i.event_id = p_event_id
     and c.guest_id = p_guest_id
     and not (c.item_id = any(v_ids));

  insert into public.signup_claims (item_id, guest_id, note)
  select (c ->> 'item_id')::uuid,
         p_guest_id,
         nullif(left(btrim(coalesce(c ->> 'note', '')), 200), '')
    from (select distinct on (c ->> 'item_id') c from jsonb_array_elements(p_claims) c) as claims(c)
  on conflict (item_id, guest_id) do update set note = excluded.note;

  return null;
end;
$$;

-- Guests reach this through server code only, which finds the guest by their
-- RSVP token first. The anon key must not call it.
revoke execute on function public.save_signup_claims(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_signup_claims(uuid, uuid, jsonb) to service_role;

-- --------------------------------------------------------------------------
-- 5. Potlucks and meal trains
-- --------------------------------------------------------------------------

alter table public.events drop constraint events_event_type_check;
alter table public.events add constraint events_event_type_check
  check (event_type in (
    'baby_shower',
    'sip_and_see',
    'bridal_shower',
    'wedding',
    'engagement',
    'bachelor',
    'birthday',
    'kids_birthday',
    'christmas',
    'gift_exchange',
    'holiday',
    'housewarming',
    'graduation',
    'retirement',
    'gathering',
    'potluck',
    'meal_train',
    'other'
  ));

commit;
