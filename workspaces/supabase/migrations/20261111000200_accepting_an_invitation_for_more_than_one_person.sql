-- ------------------------------------------------ accepting, for more than one
-- The client branch of accept_invitation could only ever admit one person: it
-- updated customers.auth_user_id and raised 'customer unavailable' when that
-- column already belonged to somebody else. It now records a membership, and
-- claims auth_user_id only when nobody holds it yet.
--
-- The level comes from the invitation. One created by the studio carries none,
-- and the first person to accept for a customer becomes its owner -- which is
-- exactly what happens today, preserved rather than changed.
create or replace function public.accept_invitation(invite_token text)
returns public.app_role
language plpgsql security definer set search_path = '' as $$
declare
  invitation public.invitations%rowtype;
  user_email text;
  v_grace smallint;
  v_first boolean;
  v_level public.customer_access;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  user_email := lower(coalesce(auth.jwt()->>'email',''));
  select * into invitation from public.invitations
   where token_hash = extensions.digest(invite_token,'sha256') for update;
  if not found or invitation.accepted_at is not null or invitation.expires_at <= now()
    then raise exception 'invitation unavailable'; end if;
  if invitation.email <> user_email then raise exception 'email mismatch'; end if;

  insert into public.memberships(organization_id,user_id,role)
  values(invitation.organization_id, auth.uid(), invitation.role)
  on conflict (organization_id,user_id) do nothing;

  if invitation.role = 'client' then
    if not exists (select 1 from public.customers
                   where id = invitation.customer_id
                     and organization_id = invitation.organization_id) then
      raise exception 'customer unavailable';
    end if;

    -- Read before writing: after the insert below, everybody is "not first".
    select not exists (select 1 from public.customer_members
                       where customer_id = invitation.customer_id)
      into v_first;

    v_level := coalesce(
      nullif(invitation.details ->> 'customer_level', '')::public.customer_access,
      case when v_first then 'owner' else 'viewer' end::public.customer_access);

    update public.customers set auth_user_id = auth.uid()
     where id = invitation.customer_id
       and organization_id = invitation.organization_id
       and auth_user_id is null;

    insert into public.customer_members(organization_id, customer_id, user_id, level, invited_by)
    values (invitation.organization_id, invitation.customer_id, auth.uid(),
            v_level, invitation.created_by)
    on conflict (customer_id, user_id) do nothing;

  elsif invitation.role = 'intern' then
    select default_grace_days into v_grace from public.organization_settings
     where organization_id = invitation.organization_id;
    insert into public.intern_profiles(organization_id,user_id,track,tier,starts_at,ends_at,
                                       mentor_id,college,status,grace_days)
    values(invitation.organization_id, auth.uid(),
           (invitation.details ->> 'track')::public.intern_track,
           (invitation.details ->> 'tier')::public.intern_tier,
           (invitation.details ->> 'starts_at')::date,
           (invitation.details ->> 'ends_at')::date,
           nullif(invitation.details ->> 'mentor_id','')::uuid,
           nullif(invitation.details ->> 'college',''),
           'active', coalesce(v_grace, 7))
    on conflict (organization_id,user_id) do nothing;

  elsif invitation.role = 'employee' then
    insert into public.staff_profiles(organization_id,user_id,roles,is_mentor,status,started_on)
    values(invitation.organization_id, auth.uid(),
           (select array_agg(value::public.staff_role)
              from jsonb_array_elements_text(invitation.details -> 'roles')),
           coalesce((invitation.details ->> 'is_mentor')::boolean,false),
           'active', current_date)
    on conflict (organization_id,user_id) do nothing;

    if invitation.details ->> 'engagement' is not null then
      insert into public.compensation(organization_id,user_id,engagement,amount,cycle_label)
      values(invitation.organization_id, auth.uid(),
             (invitation.details ->> 'engagement')::public.engagement_type,
             coalesce((invitation.details ->> 'amount')::numeric, 0),
             nullif(invitation.details ->> 'cycle_label',''));
    end if;
  end if;

  update public.invitations set accepted_at = now() where id = invitation.id;
  return invitation.role;
end $$;
