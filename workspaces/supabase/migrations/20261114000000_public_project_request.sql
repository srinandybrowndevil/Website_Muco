-- Public project request submission for the customer website.
-- Allows anonymous visitors to send a brief without signing in.
-- A guest customer record is created from the supplied email so the studio
-- can reply and the request is stored in the existing project_requests table.

create or replace function public.create_public_project_request(
  p_email text,
  p_service text,
  p_title text,
  p_problem text,
  p_requirements text default null,
  p_budget_range text default null,
  p_timeline text default null,
  p_website text default null,
  p_reference text default null,
  p_contact_preference text default 'email'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_customer_id uuid;
  v_request_id uuid;
  v_allowed_slug text := public.allowed_customer_org_slug();
  v_clean_email text := lower(btrim(p_email));
  v_clean_title text := btrim(p_title);
  v_clean_problem text := btrim(p_problem);
begin
  if v_clean_email is null or v_clean_email = '' then
    raise exception 'email is required';
  end if;
  if v_clean_title is null or v_clean_title = '' then
    raise exception 'title is required';
  end if;
  if v_clean_problem is null or v_clean_problem = '' then
    raise exception 'problem is required';
  end if;

  select id into v_org_id
  from public.organizations
  where slug = v_allowed_slug;

  if v_org_id is null then
    raise exception 'organization not found';
  end if;

  -- Re-use an existing guest customer row for the same email so repeated
  -- anonymous briefs from one person are grouped together.
  select id into v_customer_id
  from public.customers
  where email = v_clean_email
    and organization_id = v_org_id
    and auth_user_id is null;

  if v_customer_id is null then
    insert into public.customers(
      organization_id,
      name,
      email,
      status,
      metadata
    )
    values (
      v_org_id,
      v_clean_email,
      v_clean_email,
      'active',
      jsonb_build_object('source', 'public website')
    )
    returning id into v_customer_id;
  end if;

  insert into public.project_requests(
    organization_id,
    customer_id,
    status,
    service,
    title,
    problem,
    requirements,
    budget_range,
    timeline,
    website,
    reference,
    contact_preference
  )
  values (
    v_org_id,
    v_customer_id,
    'new',
    p_service,
    v_clean_title,
    v_clean_problem,
    nullif(btrim(p_requirements), ''),
    nullif(p_budget_range, ''),
    nullif(btrim(p_timeline), ''),
    nullif(btrim(p_website), ''),
    nullif(btrim(p_reference), ''),
    p_contact_preference
  )
  returning id into v_request_id;

  return v_request_id;
end $$;

revoke all on function public.create_public_project_request(text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.create_public_project_request(text,text,text,text,text,text,text,text,text,text) to anon;
