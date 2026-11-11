-- ============================================================================
-- accept_registry_invite adds the caller, not who the caller says they are
-- ============================================================================
-- accept_registry_invite is security definer, so it skips RLS, and the anon
-- key could call it. It made whoever p_user_id named a manager of the
-- registry, and p_user_id is passed in by the caller. So anyone holding an
-- invite link could make any account a manager, using up the invite.
--
-- It now adds auth.uid() and ignores p_user_id. It keeps its signature, so
-- the code that calls it doesn't change. The anon role can't call it any
-- more. Signed-in users and guests (who get an anonymous session, role
-- authenticated) still can, the same as before.
--
-- Deploy the app code first, then run this file. The dashboard used to accept
-- pending email invites with the service-role client, where auth.uid() is
-- null. If this file runs first, the dashboard stops accepting them until the
-- new code is deployed. The Accept button on the invite page already uses the
-- signed-in user's session, so it keeps working either way.
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
  'Makes the caller (auth.uid()) a manager of the invite''s registry. p_user_id is ignored.';

-- It needs a signed-in session, so the anon role has no use for it.
revoke execute on function public.accept_registry_invite(text, uuid) from public, anon;
grant execute on function public.accept_registry_invite(text, uuid) to authenticated, service_role;

commit;
