-- Website enquiries and first-party analytics for MUCO LABS.
-- Applied after the CRM schema, invitation system and customer requests.

-- ---------------------------------------------------------------------------
-- Enquiries received from the public website contact form
-- ---------------------------------------------------------------------------
create type public.website_enquiry_status as enum (
  'new',
  'contacted',
  'qualified',
  'converted',
  'closed',
  'spam'
);

create table public.website_enquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  business text,
  phone text,
  email text,
  location text,
  service text,
  website text,
  budget text,
  timeline text,
  message text not null,
  page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  ip text,
  channel text,
  status public.website_enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index website_enquiries_org_status_idx
  on public.website_enquiries(organization_id, status);
create index website_enquiries_org_created_idx
  on public.website_enquiries(organization_id, created_at desc);
create index website_enquiries_email_idx
  on public.website_enquiries(email);

create trigger website_enquiries_updated
  before update on public.website_enquiries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- First-party analytics events
-- No IP addresses, fingerprints, or cross-site identifiers are stored here.
-- Events are retained for approximately 90 days; enquiries are kept while
-- relevant and removed on request.
-- ---------------------------------------------------------------------------
create type public.analytics_event_name as enum (
  'page_view',
  'cta_click',
  'contact_click',
  'signup_click',
  'form_start',
  'lead_submit',
  'whatsapp_click',
  'phone_click',
  'email_click',
  'instagram_click',
  'faq_open',
  'project_detail_open'
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_name public.analytics_event_name not null,
  path text,
  referrer_host text,
  referrer_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint analytics_events_metadata_check check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 2000
  )
);

create index analytics_events_org_occurred_idx
  on public.analytics_events(organization_id, event_name, occurred_at desc);
create index analytics_events_path_idx
  on public.analytics_events(organization_id, path);
create index analytics_events_session_idx
  on public.analytics_events(session_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Row level security: staff members can view and manage everything;
-- clients and anonymous users have no direct access.
-- ---------------------------------------------------------------------------
alter table public.website_enquiries enable row level security;
alter table public.analytics_events enable row level security;

create policy "staff manage website enquiries"
  on public.website_enquiries
  for all
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

create policy "staff view analytics events"
  on public.analytics_events
  for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = analytics_events.organization_id
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
  );

-- ---------------------------------------------------------------------------
-- Anonymous-callable RPCs for the public website.
-- Both are fixed to the single allowed organization slug, validate every field,
-- ignore any attempt to set roles or status, and use no dynamic SQL.
-- ---------------------------------------------------------------------------
create or replace function public.ingest_website_enquiry(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org_id uuid;
  v_id uuid;
  v_status public.website_enquiry_status := 'new';
begin
  select id into v_org_id from public.organizations where slug = 'muco-labs';
  if v_org_id is null then
    raise exception 'organization not configured';
  end if;

  if coalesce(nullif(btrim(payload ->> 'name'), ''), '') = '' then
    raise exception 'name required';
  end if;
  if coalesce(nullif(btrim(payload ->> 'message'), ''), '') = '' then
    raise exception 'message required';
  end if;

  insert into public.website_enquiries (
    organization_id,
    name, business, phone, email, location, service, website, budget, timeline, message,
    page, referrer, utm_source, utm_medium, utm_campaign, ip, channel, status
  ) values (
    v_org_id,
    left(btrim(payload ->> 'name'), 100),
    left(nullif(btrim(payload ->> 'business'), ''), 120),
    left(nullif(btrim(payload ->> 'phone'), ''), 32),
    left(nullif(btrim(payload ->> 'email'), ''), 160),
    left(nullif(btrim(payload ->> 'location'), ''), 100),
    left(nullif(btrim(payload ->> 'service'), ''), 80),
    left(nullif(btrim(payload ->> 'website'), ''), 300),
    left(nullif(btrim(payload ->> 'budget'), ''), 60),
    left(nullif(btrim(payload ->> 'timeline'), ''), 60),
    left(btrim(payload ->> 'message'), 4000),
    left(nullif(btrim(payload ->> 'page'), ''), 200),
    left(nullif(btrim(payload ->> 'referrer'), ''), 300),
    left(nullif(btrim(payload ->> 'utm_source'), ''), 100),
    left(nullif(btrim(payload ->> 'utm_medium'), ''), 100),
    left(nullif(btrim(payload ->> 'utm_campaign'), ''), 100),
    left(nullif(btrim(payload ->> 'ip'), ''), 45),
    left(nullif(btrim(payload ->> 'channel'), ''), 20),
    v_status
  )
  returning id into v_id;

  return v_id;
end $$;

create or replace function public.ingest_analytics_event(payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org_id uuid;
  v_event_name text;
  v_metadata jsonb;
  v_occurred_at timestamptz;
begin
  select id into v_org_id from public.organizations where slug = 'muco-labs';
  if v_org_id is null then
    return;
  end if;

  v_event_name := lower(btrim(payload ->> 'event_name'));
  if v_event_name is null or v_event_name not in (
    'page_view','cta_click','contact_click','signup_click','form_start','lead_submit',
    'whatsapp_click','phone_click','email_click','instagram_click','faq_open','project_detail_open'
  ) then
    return;
  end if;

  v_metadata := coalesce(payload -> 'metadata', '{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' or octet_length(v_metadata::text) > 2000 then
    v_metadata := '{}'::jsonb;
  end if;

  v_occurred_at := coalesce(
    (nullif(btrim(payload ->> 'occurred_at'), '')::timestamptz),
    now()
  );

  insert into public.analytics_events (
    organization_id, event_name, path, referrer_host, referrer_path,
    utm_source, utm_medium, utm_campaign, session_id, metadata, occurred_at
  ) values (
    v_org_id,
    v_event_name::public.analytics_event_name,
    left(nullif(btrim(payload ->> 'path'), ''), 200),
    left(nullif(btrim(payload ->> 'referrer_host'), ''), 100),
    left(nullif(btrim(payload ->> 'referrer_path'), ''), 200),
    left(nullif(btrim(payload ->> 'utm_source'), ''), 100),
    left(nullif(btrim(payload ->> 'utm_medium'), ''), 100),
    left(nullif(btrim(payload ->> 'utm_campaign'), ''), 100),
    left(nullif(btrim(payload ->> 'session_id'), ''), 64),
    v_metadata,
    v_occurred_at
  );
exception when others then
  -- Do not leak internal errors to anonymous callers. Fail silently.
  return;
end $$;

-- ---------------------------------------------------------------------------
-- Staff-only aggregate/report RPC
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Grants: revoke public, then allow anon/authenticated to call the ingest RPCs
-- and authenticated staff to call the summary RPC.
-- ---------------------------------------------------------------------------
revoke all on function public.ingest_website_enquiry(jsonb) from public;
grant execute on function public.ingest_website_enquiry(jsonb) to anon, authenticated;

revoke all on function public.ingest_analytics_event(jsonb) from public;
grant execute on function public.ingest_analytics_event(jsonb) to anon, authenticated;

revoke all on function public.get_website_analytics_summary(integer) from public;
grant execute on function public.get_website_analytics_summary(integer) to authenticated;
