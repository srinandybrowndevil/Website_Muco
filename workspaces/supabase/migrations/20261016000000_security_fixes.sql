create or replace function public.complete_customer_onboarding(
  p_org_slug text,
  p_full_name text,
  p_phone text,
  p_company text,
  p_location text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_email_verified boolean;
  v_allowed_slug text;
  v_org_id uuid;
  v_customer_id uuid;
  v_clean_full_name text := nullif(btrim(p_full_name), '');
  v_clean_phone text := nullif(btrim(p_phone), '');
  v_clean_company text := nullif(btrim(p_company), '');
  v_clean_location text := nullif(btrim(p_location), '');
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select email_confirmed_at is not null into v_email_verified
  from auth.users where id = v_user_id;
  if not coalesce(v_email_verified, false) then raise exception 'email not verified'; end if;

  v_allowed_slug := public.allowed_customer_org_slug();
  if lower(btrim(p_org_slug)) <> v_allowed_slug then raise exception 'invalid organization'; end if;

  select id into v_org_id from public.organizations where slug = v_allowed_slug;
  if v_org_id is null then raise exception 'organization not found'; end if;

  update public.profiles
  set full_name = coalesce(v_clean_full_name, full_name)
  where id = v_user_id;

  select id into v_customer_id from public.customers
  where auth_user_id = v_user_id and organization_id = v_org_id;

  if v_customer_id is null then
    insert into public.customers(
      organization_id, auth_user_id, name, company, email, phone, status, metadata
    ) values (
      v_org_id,
      v_user_id,
      coalesce(v_clean_full_name, 'New customer'),
      coalesce(v_clean_company, ''),
      coalesce(auth.jwt()->>'email', ''),
      coalesce(v_clean_phone, ''),
      'active',
      jsonb_build_object('location', coalesce(v_clean_location, ''))
    ) returning id into v_customer_id;
  else
    update public.customers
    set name = coalesce(v_clean_full_name, name),
        company = coalesce(v_clean_company, company),
        email = coalesce(nullif(auth.jwt()->>'email', ''), email),
        phone = coalesce(v_clean_phone, phone),
        metadata = coalesce(metadata, '{}'::jsonb)
                   || jsonb_build_object('location', coalesce(v_clean_location, metadata->>'location', ''))
    where id = v_customer_id;
  end if;

  insert into public.memberships(organization_id, user_id, role)
  values(v_org_id, v_user_id, 'client')
  on conflict (organization_id, user_id) do update
  set role = case
    when public.memberships.role in ('admin', 'member') then public.memberships.role
    else 'client'::public.app_role
  end;

  return v_customer_id;
end $$;

revoke all on function public.complete_customer_onboarding(text,text,text,text,text) from public;
grant execute on function public.complete_customer_onboarding(text,text,text,text,text) to authenticated;

drop policy if exists "clients view own requests" on public.project_requests;
create policy "clients view own requests"
  on public.project_requests for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = project_requests.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "clients create own requests" on public.project_requests;
create policy "clients create own requests"
  on public.project_requests for insert
  with check (
    status = 'new'
    and exists (
      select 1 from public.customers c
      where c.id = project_requests.customer_id
        and c.auth_user_id = auth.uid()
        and c.organization_id = project_requests.organization_id
    )
  );

drop policy if exists "staff manage requests" on public.project_requests;
create policy "staff manage requests"
  on public.project_requests for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = project_requests.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = project_requests.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
  );

drop policy if exists "staff manage website enquiries" on public.website_enquiries;
create policy "staff manage website enquiries"
  on public.website_enquiries for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = website_enquiries.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = website_enquiries.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
  );

drop policy if exists "staff view analytics events" on public.analytics_events;
create policy "staff view analytics events"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = analytics_events.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
  );
