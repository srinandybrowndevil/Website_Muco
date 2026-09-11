-- An authorisation check that does nothing when the caller is nobody.
--
-- convert_request and convert_website_enquiry both read the caller's role into
-- a text variable and then wrote:
--
--     if v_role <> 'admin' then raise exception 'admin required'; end if;
--
-- When the caller holds no membership row in that organization the select
-- assigns nothing, so v_role is NULL, and NULL <> 'admin' is NULL rather than
-- true. PL/pgSQL treats a NULL condition as false, so the THEN branch never
-- runs and the exception is never raised. The check fails open: it refuses a
-- client, refuses an intern, refuses an employee -- every case anybody tested
-- -- and waves through the one caller it was never tested with, the one who
-- belongs to no organization at all.
--
-- Both functions are SECURITY DEFINER, so row-level security is not there to
-- catch it afterwards. Today that means a signed-up account that has not
-- finished onboarding, or an account whose membership was removed. It matters
-- more than that for the multi-tenant work: the lookup is scoped to the target
-- row's organization, so a member of organization B is "nobody" with respect
-- to organization A, and would pass this check against A's records.
--
-- Exploiting it still needs the uuid of a request or an enquiry, which is not
-- guessable. That bounds it; it does not make the check correct.
--
-- The fix is not to spell the comparison more carefully. It is to stop writing
-- the comparison here at all: is_org_admin already exists, already returns
-- false rather than null for a non-member, and already honours disabled_at.

-- ------------------------------------------------- the disable switch, again
-- Three SECURITY DEFINER functions read public.memberships directly rather
-- than through the four predicates, so the switch added in
-- 20261104000000 never reached them. A switched-off administrator could still
-- convert a request, convert an enquiry, and read the website analytics.
--
-- That makes the claim attached to that migration -- that one change disables
-- a person everywhere at once -- untrue as written. It is true of every
-- policy, because policies call the predicates. It was not true of a function
-- that queries the table itself. Two of the three are corrected above by
-- routing through is_org_admin; the third keeps its own shape, because it
-- already fails closed, and gains the missing condition.


create or replace function public.convert_request(
  p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_req public.project_requests%rowtype;
  v_actor uuid := auth.uid();
  v_lead_id uuid;
  v_project_id uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;

  select * into v_req from public.project_requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if not public.is_org_admin(v_req.organization_id) then
    raise exception 'admin required';
  end if;
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

create or replace function public.convert_website_enquiry(p_enquiry_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_enquiry public.website_enquiries%rowtype;
  v_actor uuid := auth.uid();
  v_lead_id uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;

  select * into v_enquiry
  from public.website_enquiries
  where id = p_enquiry_id
  for update;
  if not found then raise exception 'enquiry not found'; end if;
  if not public.is_org_admin(v_enquiry.organization_id) then
    raise exception 'admin required';
  end if;

  if v_enquiry.converted_lead_id is not null then
    return jsonb_build_object('lead_id', v_enquiry.converted_lead_id, 'already_converted', true);
  end if;

  insert into public.leads(
    organization_id, owner_id, name, company, email, source, stage, estimated_value
  ) values (
    v_enquiry.organization_id,
    v_actor,
    v_enquiry.name,
    coalesce(nullif(v_enquiry.business, ''), v_enquiry.name),
    v_enquiry.email,
    left('website enquiry' || case when v_enquiry.channel is not null then ' · ' || v_enquiry.channel else '' end, 80),
    'new',
    0
  ) returning id into v_lead_id;

  update public.website_enquiries
  set status = 'converted', converted_at = now(), converted_lead_id = v_lead_id
  where id = p_enquiry_id;

  insert into public.activities(
    organization_id, actor_id, entity_type, entity_id, action, payload
  ) values (
    v_enquiry.organization_id, v_actor, 'website_enquiry', p_enquiry_id,
    'converted', jsonb_build_object('lead_id', v_lead_id)
  );

  return jsonb_build_object('lead_id', v_lead_id, 'already_converted', false);
end $$;

create or replace function public.get_website_analytics_summary(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_start timestamptz;
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select m.organization_id into v_org_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.role in ('admin','member')
    and m.disabled_at is null
  limit 1;

  if v_org_id is null then
    raise exception 'not authorized';
  end if;

  v_start := now() - (v_days || ' days')::interval;

  return jsonb_build_object(
    'period_days', v_days,
    'enquiries_total', (
      select count(*)::int from public.website_enquiries
      where organization_id = v_org_id
    ),
    'enquiries_new_7d', (
      select count(*)::int from public.website_enquiries
      where organization_id = v_org_id and created_at > now() - interval '7 days'
    ),
    'page_views', (
      select count(*)::int from public.analytics_events
      where organization_id = v_org_id and event_name = 'page_view' and occurred_at > v_start
    ),
    'cta_clicks', (
      select count(*)::int from public.analytics_events
      where organization_id = v_org_id and event_name = 'cta_click' and occurred_at > v_start
    ),
    'contact_clicks', (
      select count(*)::int from public.analytics_events
      where organization_id = v_org_id and event_name in ('contact_click','whatsapp_click','phone_click','email_click') and occurred_at > v_start
    ),
    'signup_clicks', (
      select count(*)::int from public.analytics_events
      where organization_id = v_org_id and event_name = 'signup_click' and occurred_at > v_start
    ),
    'lead_submits', (
      select count(*)::int from public.analytics_events
      where organization_id = v_org_id and event_name = 'lead_submit' and occurred_at > v_start
    ),
    'top_paths', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select path, count(*)::int as views
        from public.analytics_events
        where organization_id = v_org_id and event_name = 'page_view' and occurred_at > v_start
        group by path
        order by views desc, path asc
        limit 10
      ) t
    ), '[]'::jsonb),
    'source_breakdown', coalesce((
      select jsonb_object_agg(coalesce(nullif(utm_source, ''), 'direct'), c::int)
      from (
        select utm_source, count(*) as c
        from public.analytics_events
        where organization_id = v_org_id and occurred_at > v_start
        group by utm_source
      ) t
    ), '{}'::jsonb),
    'utm_breakdown', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select
          coalesce(nullif(utm_source, ''), 'direct') as source,
          coalesce(nullif(utm_medium, ''), 'none') as medium,
          coalesce(nullif(utm_campaign, ''), 'none') as campaign,
          count(*)::int as count
        from public.analytics_events
        where organization_id = v_org_id and occurred_at > v_start
        group by utm_source, utm_medium, utm_campaign
        order by count desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select id, event_name, path, occurred_at
        from public.analytics_events
        where organization_id = v_org_id and occurred_at > v_start
        order by occurred_at desc
        limit 25
      ) t
    ), '[]'::jsonb)
  );
end $$;

-- Verified by reading the emitted definitions rather than by trusting the
-- edit: v_role is gone from both convert functions, declaration included,
-- both call
-- is_org_admin, and the analytics lookup carries disabled_at. Not yet run
-- against the database -- the connector is disconnected -- so this joins
-- 20261106 and 20261107 in the queue to apply.

-- ------------------------------------------- a policy that granted too much
-- "staff read granted projects", added yesterday in 20261106000000, was too
-- wide. It was written to fix a real bug -- an employee could not read the
-- project their own grant named, so every assignment rendered as "Unnamed
-- project" -- but it grants SELECT on the whole row to anybody holding any
-- live grant, whatever that grant is for.
--
-- The sibling policy added in the same migration gets this right: files are
-- restricted to grants on 'scope' or 'files'. This one has no such scoping, so
-- a grant of module 'tickets' at level 'read' -- a narrow support permission
-- the grants screen offers for interns -- also discloses budget, repo_url,
-- customer_id, owner_id and the staging links.
--
-- The staff page never asks for budget or repo_url, and reveals the staging
-- links only when a staging grant is held. But that gating is written in the
-- page, and a page is not a boundary: the same row is one direct API call
-- away. Row-level security cannot restrict columns, so the answer is not a
-- better policy, it is a narrower object to read.
drop policy if exists "staff read granted projects" on public.projects;

-- Exactly the columns the staff project room renders, and nothing else.
-- security_invoker is off, so the view reads the table with its owner's rights
-- and does the filtering itself -- which is why the policy above can go.
create or replace view public.granted_projects
with (security_invoker = false) as
select
  p.id, p.organization_id, p.name, p.description, p.status, p.progress,
  p.kind, p.starts_on, p.due_on,
  -- The staging gate moves out of the page and into the data. Somebody with a
  -- tickets grant now gets null here rather than a link the interface simply
  -- chose not to draw for them.
  case when public.is_org_staff(p.organization_id) or exists (
         select 1 from public.project_grants g
         where g.project_id = p.id and g.user_id = auth.uid()
           and g.module = 'staging' and (g.ends_at is null or g.ends_at >= current_date))
       then p.preview_url end as preview_url,
  case when public.is_org_staff(p.organization_id) or exists (
         select 1 from public.project_grants g
         where g.project_id = p.id and g.user_id = auth.uid()
           and g.module = 'staging' and (g.ends_at is null or g.ends_at >= current_date))
       then p.staging_url end as staging_url
from public.projects p
where public.is_org_staff(p.organization_id)
   or exists (select 1 from public.project_grants g
              where g.project_id = p.id and g.user_id = auth.uid()
                and (g.ends_at is null or g.ends_at >= current_date));

revoke all on public.granted_projects from public, anon;
grant select on public.granted_projects to authenticated;

comment on view public.granted_projects is
  'What somebody holding a project grant may read: the room, not the money. budget, repo_url, customer_id and owner_id are absent by construction, and the staging links appear only with a staging grant.';
