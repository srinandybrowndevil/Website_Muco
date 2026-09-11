create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  role public.app_role not null,
  customer_id uuid references public.customers(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((role = 'client' and customer_id is not null) or (role <> 'client' and customer_id is null))
);
create index invitations_org_idx on public.invitations(organization_id);
create index invitations_expiry_idx on public.invitations(expires_at) where accepted_at is null;
alter table public.invitations enable row level security;
create policy "admins view invitations" on public.invitations for select using (public.is_org_admin(organization_id));
create policy "admins revoke invitations" on public.invitations for delete using (public.is_org_admin(organization_id));

create function public.create_invitation(invite_organization_id uuid, invite_email text, invite_role public.app_role, invite_customer_id uuid default null, valid_for interval default interval '7 days')
returns text language plpgsql security definer set search_path = '' as $$
declare raw_token text; normalized_email text := lower(btrim(invite_email));
begin
  if not public.is_org_admin(invite_organization_id) then raise exception 'not authorized'; end if;
  if valid_for <= interval '0 seconds' or valid_for > interval '30 days' then raise exception 'invalid expiry'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid email'; end if;
  if (invite_role = 'client') <> (invite_customer_id is not null) then raise exception 'invalid customer role'; end if;
  if invite_customer_id is not null and not exists(select 1 from public.customers where id=invite_customer_id and organization_id=invite_organization_id) then raise exception 'invalid customer'; end if;
  raw_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.invitations(token_hash,organization_id,email,role,customer_id,expires_at,created_by)
  values(extensions.digest(raw_token,'sha256'),invite_organization_id,normalized_email,invite_role,invite_customer_id,now()+valid_for,auth.uid());
  return raw_token;
end $$;

create function public.get_invitation(invite_token text)
returns table(organization_name text, invited_email text, invited_role public.app_role, expires_at timestamptz, available boolean)
language sql stable security definer set search_path = '' as $$
  select o.name, regexp_replace(i.email,'(^.).*(@.*$)','\1•••\2'), i.role, i.expires_at, (i.accepted_at is null and i.expires_at > now())
  from public.invitations i join public.organizations o on o.id=i.organization_id
  where i.token_hash=extensions.digest(invite_token,'sha256') limit 1
$$;

create function public.accept_invitation(invite_token text)
returns public.app_role language plpgsql security definer set search_path = '' as $$
declare invitation public.invitations%rowtype; user_email text; begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  user_email := lower(coalesce(auth.jwt()->>'email',''));
  select * into invitation from public.invitations where token_hash=extensions.digest(invite_token,'sha256') for update;
  if not found or invitation.accepted_at is not null or invitation.expires_at <= now() then raise exception 'invitation unavailable'; end if;
  if invitation.email <> user_email then raise exception 'email mismatch'; end if;
  insert into public.memberships(organization_id,user_id,role) values(invitation.organization_id,auth.uid(),invitation.role)
  on conflict (organization_id,user_id) do nothing;
  if invitation.role='client' then
    update public.customers set auth_user_id=auth.uid() where id=invitation.customer_id and organization_id=invitation.organization_id and (auth_user_id is null or auth_user_id=auth.uid());
    if not found then raise exception 'customer unavailable'; end if;
  end if;
  update public.invitations set accepted_at=now() where id=invitation.id;
  return invitation.role;
end $$;

revoke all on function public.create_invitation(uuid,text,public.app_role,uuid,interval) from public;
revoke all on function public.get_invitation(text) from public;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.create_invitation(uuid,text,public.app_role,uuid,interval) to authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
