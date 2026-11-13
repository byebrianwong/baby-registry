-- ============================================================================
-- Guests can't accept a co-manager invite
-- ============================================================================
-- A guest who reserves a gift gets an anonymous Supabase session, with the
-- authenticated role. accept_registry_invite let that session accept an
-- invite link, which made the anonymous user a manager of the registry. An
-- anonymous session isn't an account: it can't sign back in from another
-- browser, and it's gone when its cookie is.
--
-- The invite page and the acceptInvite server action now refuse anonymous
-- sessions too. This function is the check that holds when someone calls it
-- straight through the Data API with the anon key and a guest's session.
--
-- The function now also requires the caller to be in auth.users and not
-- anonymous. Everything else is the same as in
-- 20261111041540_accept_invite_caller_from_auth_uid.sql, grants included, so
-- this file is safe to run whether or not that one has run.
--
-- The code and this file can deploy in either order. Accounts accept invites
-- as before. The live code only reaches this function for a guest from the
-- invite page's Accept button, and this file makes that fail with a clear
-- message.
--
-- Safe to run more than once.

begin;

create or replace function public.accept_registry_invite(
  p_token   text,
  p_user_id uuid  -- ignored; the caller is auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller     uuid := auth.uid();
  v_invite     record;
  v_manager_id uuid;
begin
  if v_caller is null then
    raise exception 'Sign in to accept this invite'
      using errcode = '42501';
  end if;

  -- Guests have anonymous sessions. Managing a registry takes an account.
  if not exists (
    select 1 from auth.users u
     where u.id = v_caller
       and not u.is_anonymous
  ) then
    raise exception 'Sign in or create an account to accept this invite'
      using errcode = '42501';
  end if;

  -- Lock the invite row
  select i.*
    into v_invite
    from public.registry_invites i
   where i.token = p_token
   for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'This invite has been fully used';
  end if;

  -- An email invite only works for the account with that address
  if v_invite.email is not null then
    if not exists (
      select 1 from auth.users u
       where u.id = v_caller
         and u.email = v_invite.email
    ) then
      raise exception 'This invite was sent to a different email address';
    end if;
  end if;

  if exists (
    select 1 from public.registry_managers m
     where m.registry_id = v_invite.registry_id
       and m.user_id = v_caller
  ) then
    raise exception 'You are already a manager of this registry';
  end if;

  insert into public.registry_managers (registry_id, user_id, role)
  values (v_invite.registry_id, v_caller, 'manager')
  returning id into v_manager_id;

  update public.registry_invites
     set use_count = use_count + 1
   where id = v_invite.id;

  return v_manager_id;
end;
$$;

comment on function public.accept_registry_invite(text, uuid) is
  'Makes the caller (auth.uid()) a manager of the invite''s registry. Refuses guests'' anonymous sessions. p_user_id is ignored.';

-- It needs a signed-in session, so the anon role has no use for it.
revoke execute on function public.accept_registry_invite(text, uuid) from public, anon;
grant execute on function public.accept_registry_invite(text, uuid) to authenticated, service_role;

commit;
