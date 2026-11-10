-- ============================================================================
-- Profile links without usernames, search by email, and follow invites
-- ============================================================================
-- Usernames are gone from the app. Every account now has a profile at a link
-- made from a random id, such as /u/jane-doe-k7m2p9qx4t. Only the id is looked
-- up. The name part is there to read, so the link keeps working after a name
-- change. Ten characters from a 32-letter alphabet can't be guessed, so a
-- profile is still reachable only by people who were given its link or found
-- it through search.
--
-- People can also be found by typing their full email address, if they turned
-- that on. When nobody turns up, the searcher can send that address a follow
-- invite instead.
--
-- Run this BEFORE deploying the app code that reads it. It's additive, so the
-- code that's currently deployed keeps working. Before running it, check that
-- public.handle_new_user on production still matches 001_initial_schema.sql,
-- because this file replaces it.
--
-- `profiles.username` stays for now. Nothing sets it anymore. The profile page
-- uses it only to redirect old /u/<username> links to the new ones. A later
-- migration can drop the column once those links no longer matter.

-- ----------------------------------------------------------------------------
-- Profile ids
-- ----------------------------------------------------------------------------
-- Ten characters with no l, o, 0 or 1, so they're easy to read back. They're
-- taken from the random bytes of a v4 UUID (gen_random_uuid uses a strong
-- random source), skipping the bytes that hold its version and variant. 256 is
-- a multiple of 32, so every character is equally likely. Mirrored in
-- src/lib/profile-link.ts.
create or replace function public.new_profile_public_id()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
           substr('abcdefghijkmnpqrstuvwxyz23456789', get_byte(random_uuid.bytes, i) % 32 + 1, 1),
           '' order by i)
    from (select uuid_send(gen_random_uuid()) as bytes) as random_uuid,
         unnest(array[0, 1, 2, 3, 4, 5, 10, 11, 12, 13]) as i;
$$;

-- A volatile default is worked out once per row, so every existing profile
-- gets its own id.
alter table public.profiles
  add column public_id text not null unique default public.new_profile_public_id()
    constraint profiles_public_id_format check (public_id ~ '^[a-kmnp-z2-9]{10}$');

-- Finding someone by email is a separate choice from finding them by name.
-- Existing profiles stay out of email search until their owner turns it on.
-- New accounts choose on the sign-up form, where the box starts ticked.
alter table public.profiles
  add column findable_by_email boolean not null default false;

-- Sign-up passes `findable` in the user metadata when its "Let friends find
-- me" box is ticked. That box covers both name and email search. Guests
-- (anonymous sessions) never pass it, so they stay out of both.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  findable boolean := coalesce(new.raw_user_meta_data ->> 'findable', '') = 'true';
begin
  insert into public.profiles (id, full_name, avatar_url, discoverable, findable_by_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    findable,
    findable
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Email lookup
-- ----------------------------------------------------------------------------
-- Email addresses live only in auth.users. The app calls this with the
-- service-role client, then checks `findable_by_email` and blocks itself.
-- Unconfirmed addresses don't count, so signing up with someone else's email
-- can't make you show up when people search for them.
create or replace function public.account_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
    from auth.users
   where lower(email) = lower(btrim(p_email))
     and email_confirmed_at is not null
     and not is_anonymous
   limit 1;
$$;

-- Functions in public can be run by anyone by default, including through the
-- Data API with the anon key. This one would tell anyone whether an email has
-- an account, so only the service role can run it.
revoke execute on function public.account_id_for_email(text) from public, anon, authenticated;
grant execute on function public.account_id_for_email(text) to service_role;

-- Each email lookup someone makes, so the app can cap how many they make in an
-- hour. Otherwise one account could check a whole list of addresses. Server
-- only, like the tables below.
create table public.email_searches (
  searcher_id uuid not null references public.profiles(id) on delete cascade,
  searched_at timestamptz not null default now()
);

create index idx_email_searches_searcher on public.email_searches(searcher_id, searched_at);

alter table public.email_searches enable row level security;
revoke all on public.email_searches from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Follow invites
-- ----------------------------------------------------------------------------
-- An invite is a follow request sent to an email address. Whoever opens the
-- link and says yes is followed by the inviter. The address itself isn't
-- kept, only a SHA-256 hash of it in lowercase, which is enough to stop the
-- same address getting invited again and again. The token is kept as a hash
-- too, so reading this table doesn't give anyone working links.
--
-- Like `follows`, this is only reachable from the server: RLS is on with no
-- policies and the API roles have no grants.
create table public.follow_invites (
  id          uuid primary key default gen_random_uuid(),
  inviter_id  uuid not null references public.profiles(id) on delete cascade,
  email_hash  text not null,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  -- Set when the invite is accepted or declined. Rows are kept after that,
  -- because the sending limits count them.
  used_at     timestamptz
);

-- How many invites someone sent lately, and how many an address got.
create index idx_follow_invites_inviter on public.follow_invites(inviter_id, created_at);
create index idx_follow_invites_email on public.follow_invites(email_hash, created_at);

alter table public.follow_invites enable row level security;
revoke all on public.follow_invites from anon, authenticated;
