-- --------------------------------------------------------- inviting a colleague
-- An owner may add somebody to their own organisation. Everything that decides
-- what the invitation means is taken from the caller's own record rather than
-- from an argument: the organisation, the customer and the role are not
-- parameters, so there is nothing here to point at somebody else's data.
--
-- Deliberately not reusing create_invitation: that function requires
-- is_org_admin, and it should keep requiring it. This is a narrower power with
-- a narrower check, and the two should not share a door.
create or replace function public.invite_client_colleague(
  p_email text,
  p_level text default 'viewer'
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_customer public.customers%rowtype;
  v_level public.customer_access;
  v_email text := lower(btrim(p_email));
  v_token text;
  v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;

  begin
    v_level := p_level::public.customer_access;
  exception when others then
    raise exception 'A colleague joins as a manager or a viewer.';
  end;

  -- Ownership is not transferable by invitation. Two owners is an argument
  -- about who may remove whom, and the studio should settle that rather than
  -- discovering it afterwards.
  if v_level = 'owner' then
    raise exception 'An owner cannot be invited. Ask the studio to transfer ownership.';
  end if;

  select c.* into v_customer
  from public.customers c
  join public.customer_members m on m.customer_id = c.id
  join public.memberships mm on mm.user_id = m.user_id and mm.organization_id = m.organization_id
  where m.user_id = (select auth.uid())
    and m.level = 'owner'
    and mm.disabled_at is null
  limit 1;

  if not found then
    raise exception 'Only the owner of an organisation may invite somebody to it.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'That does not look like an email address.';
  end if;

  -- A ceiling, because an invitation function reachable by a customer is a
  -- thing worth bounding. Ten is more people than any customer here has and
  -- small enough that a stolen session cannot mint accounts all afternoon.
  select count(*) into v_count from public.customer_members where customer_id = v_customer.id;
  if v_count >= 10 then
    raise exception 'This organisation already has ten people. Ask the studio to raise that.';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.invitations(token_hash, organization_id, email, role, customer_id,
                                 expires_at, created_by, details)
  values (extensions.digest(v_token, 'sha256'), v_customer.organization_id, v_email, 'client',
          v_customer.id, now() + interval '7 days', (select auth.uid()),
          jsonb_build_object('customer_level', v_level::text));

  perform public.record_audit_event('client.invite', 'customer', v_customer.id,
          jsonb_build_object('email', v_email, 'level', v_level::text), v_customer.organization_id);

  return v_token;
end $$;

revoke all on function public.invite_client_colleague(text, text) from public, anon;
grant execute on function public.invite_client_colleague(text, text) to authenticated;

-- ------------------------------------------------------- removing a colleague
create or replace function public.remove_client_colleague(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid;
  v_org uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot remove yourself. Ask the studio.';
  end if;

  select m.customer_id, m.organization_id into v_customer, v_org
  from public.customer_members m
  join public.memberships mm on mm.user_id = m.user_id and mm.organization_id = m.organization_id
  where m.user_id = (select auth.uid()) and m.level = 'owner' and mm.disabled_at is null
  limit 1;

  if not found then
    raise exception 'Only the owner of an organisation may remove somebody from it.'
      using errcode = 'insufficient_privilege';
  end if;

  -- An owner may remove a manager or a viewer from their own organisation, and
  -- nobody else. Naming the customer in the delete rather than trusting the
  -- argument is what keeps p_user from pointing anywhere else.
  delete from public.customer_members
  where customer_id = v_customer and user_id = p_user and level <> 'owner';

  perform public.record_audit_event('client.remove', 'customer', v_customer,
          jsonb_build_object('user_id', p_user), v_org);
end $$;

revoke all on function public.remove_client_colleague(uuid) from public, anon;
grant execute on function public.remove_client_colleague(uuid) to authenticated;
