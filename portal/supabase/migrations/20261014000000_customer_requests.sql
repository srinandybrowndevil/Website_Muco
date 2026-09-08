-- Customer project requests and public onboarding for MUCO LABS.
-- This migration is applied after the CRM schema and invitation system.

create type public.project_request_status as enum ('new','reviewing','needs_info','accepted','declined');

create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status public.project_request_status not null default 'new',
  service text,
  title text not null,
  problem text,
  requirements text,
  budget_range text,
  timeline text,
  website text,
  reference text,
  contact_preference text check (contact_preference in ('email','phone','video','chat')),
  attachments jsonb not null default '[]'::jsonb,
  converted_at timestamptz,
  converted_lead_id uuid references public.leads(id) on delete set null,
  converted_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_requests_org_status_idx on public.project_requests(organization_id, status);
create index project_requests_customer_idx on public.project_requests(customer_id);
create index project_requests_created_idx on public.project_requests(organization_id, created_at desc);
create index project_requests_converted_idx on public.project_requests(converted_at) where converted_at is null;

create trigger project_requests_updated before update on public.project_requests for each row execute function public.set_updated_at();

-- Helper: the only slug that public customer self-onboarding is allowed to bind to.
create or replace function public.allowed_customer_org_slug()
returns text language sql immutable set search_path = '' as $$
  select 'muco-labs'
$$;

-- Complete customer onboarding. Idempotent: can be called again after a fresh sign-up
-- or if the customer profile needs to be refreshed. Requires a verified email address.
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

  -- Email must be confirmed before the customer record is created.
  select email_confirmed_at is not null into v_email_verified
  from auth.users where id = v_user_id;
  if not coalesce(v_email_verified, false) then raise exception 'email not verified'; end if;

  v_allowed_slug := public.allowed_customer_org_slug();
  if lower(btrim(p_org_slug)) <> v_allowed_slug then raise exception 'invalid organization'; end if;

  select id into v_org_id from public.organizations where slug = v_allowed_slug;
  if v_org_id is null then raise exception 'organization not found'; end if;

  -- Keep the profile in sync with the onboarding details.
  update public.profiles
  set full_name = coalesce(v_clean_full_name, full_name)
  where id = v_user_id;

  -- Idempotent customer record. A customer is owned by the authenticated user.
  select id into v_customer_id from public.customers
  where auth_user_id = v_user_id and organization_id = v_org_id;

  if v_customer_id is null then
    insert into public.customers(
      organization_id, auth_user_id, name, company, email, phone, status, metadata
    )
    values (
      v_org_id,
      v_user_id,
      coalesce(v_clean_full_name, 'New customer'),
      coalesce(v_clean_company, ''),
      coalesce(auth.jwt()->>'email', ''),
      coalesce(v_clean_phone, ''),
      'active',
      jsonb_build_object('location', coalesce(v_clean_location, ''))
    )
    returning id into v_customer_id;
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

-- Admin-only transactional conversion of an accepted request into a lead,
-- project and activity. Prevents duplicate conversion per request.
create or replace function public.convert_request(
  p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_req public.project_requests%rowtype;
  v_actor uuid := auth.uid();
  v_role text;
  v_lead_id uuid;
  v_project_id uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;

  select * into v_req from public.project_requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;

  select role::text into v_role from public.memberships
  where organization_id = v_req.organization_id and user_id = v_actor;

  if v_role <> 'admin' then raise exception 'admin required'; end if;
  if v_req.status <> 'accepted' then raise exception 'request must be accepted'; end if;
  if v_req.converted_at is not null then raise exception 'already converted'; end if;

  -- Create a lead from the customer record.
  insert into public.leads(
    organization_id, owner_id, name, company, email, source, stage, estimated_value
  )
  select
    v_req.organization_id,
    v_actor,
    c.name,
    coalesce(nullif(c.company, ''), c.name),
    c.email,
    'customer request',
    'new',
    0
  from public.customers c
  where c.id = v_req.customer_id
  returning id into v_lead_id;

  -- Create the matching project.
  insert into public.projects(
    organization_id, customer_id, owner_id, name, description, status, budget
  )
  values (
    v_req.organization_id,
    v_req.customer_id,
    v_actor,
    v_req.title,
    left(coalesce(v_req.requirements, v_req.problem, ''), 500),
    'planning',
    null
  )
  returning id into v_project_id;

  -- Mark the request as converted and store the resulting records.
  update public.project_requests
  set status = 'accepted',
      converted_at = now(),
      converted_lead_id = v_lead_id,
      converted_project_id = v_project_id
  where id = p_request_id;

  insert into public.activities(
    organization_id, actor_id, entity_type, entity_id, action, payload
  )
  values (
    v_req.organization_id,
    v_actor,
    'project_request',
    p_request_id,
    'converted',
    jsonb_build_object('lead_id', v_lead_id, 'project_id', v_project_id)
  );

  return jsonb_build_object('lead_id', v_lead_id, 'project_id', v_project_id);
end $$;

alter table public.project_requests enable row level security;

-- Clients can see only their own requests, routed through the customer record.
create policy "clients view own requests"
  on public.project_requests
  for select
  using (
    exists (
      select 1 from public.customers c
      where c.id = project_requests.customer_id and c.auth_user_id = auth.uid()
    )
  );

-- Clients can create requests for themselves. The status must start at 'new'.
create policy "clients create own requests"
  on public.project_requests
  for insert
  with check (
    status = 'new' and
    exists (
      select 1 from public.customers c
      where c.id = project_requests.customer_id
        and c.auth_user_id = auth.uid()
        and c.organization_id = project_requests.organization_id
    )
  );

-- Admins and members can read, update and manage every request in their org.
create policy "staff manage requests"
  on public.project_requests
  for all
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

revoke all on function public.allowed_customer_org_slug() from public;
grant execute on function public.allowed_customer_org_slug() to authenticated;
grant select, insert, update, delete on public.project_requests to authenticated;

revoke all on function public.complete_customer_onboarding(text,text,text,text,text) from public;
grant execute on function public.complete_customer_onboarding(text,text,text,text,text) to authenticated;

revoke all on function public.convert_request(uuid) from public;
grant execute on function public.convert_request(uuid) to authenticated;
