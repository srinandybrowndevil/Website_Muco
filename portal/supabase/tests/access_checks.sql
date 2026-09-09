-- Access checks. Run after all migrations.
--
--   psql "$DATABASE_URL" -f supabase/tests/access_checks.sql
--
-- Safe against production: every write attempted here is expected to be
-- refused, and the whole file runs inside a transaction that rolls back.
-- Do not disable RLS to make a check pass.
--
-- Last run 9 September 2026 against production: all five write attempts
-- refused, every cross-customer read returned zero.
begin;

-- ---------------------------------------------------------------- structure
do $$
declare policy_row record;
begin
  for policy_row in
    select * from pg_policies
    where schemaname = 'public'
      and tablename in ('leads','customers','tasks','projects','proposals','invoices','files')
      and cmd = 'ALL'
  loop
    if coalesce(policy_row.qual, '') like '%is_org_member%' then
      raise exception 'Unsafe broad membership policy remains on %', policy_row.tablename;
    end if;
  end loop;

  -- A minimum, not an exact match. Pinning the number meant this file failed on
  -- every migration until someone remembered to edit it, which is how it came
  -- to be asserting 7 against a schema that had already reached 9.
  if (select public.crm_schema_version()) < 9 then
    raise exception 'Schema older than this test expects: %', (select public.crm_schema_version());
  end if;

  if not exists (select 1 from storage.buckets where id = 'crm-files' and public = false) then
    raise exception 'Private bucket missing';
  end if;

  if (select count(*) from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename in ('leads','customers','tasks','projects','website_enquiries','project_requests','analytics_events')) <> 7 then
    raise exception 'Realtime publication incomplete';
  end if;

  -- Added after finding purge_expired_analytics_events granted to anon with no
  -- authorisation check of its own: it could delete every analytics event.
  if has_function_privilege('anon', 'public.purge_expired_analytics_events(integer)', 'EXECUTE') then
    raise exception 'purge_expired_analytics_events is callable by anon';
  end if;
end $$;

-- ---------------------------------------------------------- read isolation
-- Finds a real customer itself. The previous version of this section was
-- commented out and needed UUIDs pasted in by hand, so in practice it never ran.
do $$
declare
  v_auth uuid;
  counts jsonb;
begin
  select auth_user_id into v_auth
  from public.customers where auth_user_id is not null order by created_at limit 1;
  if v_auth is null then raise exception 'no customer with a login to probe with'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_auth, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Gathered while the role is switched, reported after it is reset: the temp
  -- table belongs to the invoker and authenticated cannot write to it.
  counts := jsonb_build_object(
    'leads',             (select count(*) from public.leads),
    'customers',         (select count(*) from public.customers),
    'invoices',          (select count(*) from public.invoices),
    'proposals',         (select count(*) from public.proposals),
    'projects',          (select count(*) from public.projects),
    'files',             (select count(*) from public.files),
    'memberships',       (select count(*) from public.memberships),
    'website_enquiries', (select count(*) from public.website_enquiries),
    'analytics_events',  (select count(*) from public.analytics_events),
    'activities',        (select count(*) from public.activities),
    'invitations',       (select count(*) from public.invitations),
    'project_requests',  (select count(*) from public.project_requests));

  reset role;
  perform set_config('request.jwt.claims', null, true);

  create temporary table isolation_reads(payload jsonb) on commit drop;
  insert into isolation_reads values (counts);
end $$;

select k.key as table_name,
       k.value::int as customer_sees,
       case
         when k.key in ('customers', 'memberships')
           then case when k.value::int <= 1 then 'own row only' else 'LEAK' end
         when k.key = 'project_requests' then 'own requests only'
         when k.value::int = 0 then 'blocked'
         else 'LEAK'
       end as verdict
from isolation_reads p, jsonb_each_text(p.payload) k
order by k.key;

-- --------------------------------------------------------- write isolation
do $$
declare
  v_auth uuid; v_cust uuid; v_org uuid; v_other uuid;
  results jsonb := '{}'::jsonb;
begin
  select auth_user_id, id, organization_id into v_auth, v_cust, v_org
  from public.customers where auth_user_id is not null order by created_at limit 1;
  select id into v_other from public.customers where id <> v_cust limit 1;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_auth, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.project_requests(organization_id, customer_id, status, title, problem)
    values (v_org, coalesce(v_other, v_cust), 'new', 'probe-impersonate', 'x');
    results := results || jsonb_build_object('raise request as another customer', 'ALLOWED - PROBLEM');
  exception when others then
    results := results || jsonb_build_object('raise request as another customer', 'refused');
  end;

  begin
    insert into public.project_requests(organization_id, customer_id, status, title, problem)
    values (v_org, v_cust, 'accepted', 'probe-status', 'x');
    results := results || jsonb_build_object('submit request pre-accepted', 'ALLOWED - PROBLEM');
  exception when others then
    results := results || jsonb_build_object('submit request pre-accepted', 'refused');
  end;

  begin
    update public.project_requests set status = 'accepted' where customer_id = v_cust;
    results := results || jsonb_build_object('accept own request',
      case when found then 'ALLOWED - PROBLEM' else 'refused' end);
  exception when others then
    results := results || jsonb_build_object('accept own request', 'refused');
  end;

  begin
    update public.memberships set role = 'admin' where user_id = v_auth;
    results := results || jsonb_build_object('grant self admin',
      case when found then 'ALLOWED - PROBLEM' else 'refused' end);
  exception when others then
    results := results || jsonb_build_object('grant self admin', 'refused');
  end;

  begin
    insert into public.invoices(organization_id, customer_id, number, amount, status)
    values (v_org, v_cust, 'PROBE-' || substr(gen_random_uuid()::text, 1, 8), 0, 'paid');
    results := results || jsonb_build_object('write own invoice', 'ALLOWED - PROBLEM');
  exception when others then
    results := results || jsonb_build_object('write own invoice', 'refused');
  end;

  reset role;
  perform set_config('request.jwt.claims', null, true);

  create temporary table isolation_writes(payload jsonb) on commit drop;
  insert into isolation_writes values (results);
end $$;

select k.key as attempt, k.value as outcome
from isolation_writes p, jsonb_each_text(p.payload) k order by k.key;

-- Belt and braces: the rollback below undoes anything that did slip through,
-- but a non-zero count here means a policy allowed a write it should not have.
select
  (select count(*) from public.project_requests where title  like 'probe-%') as probe_requests,
  (select count(*) from public.invoices         where number like 'PROBE-%') as probe_invoices,
  (select count(*) from public.project_requests where status = 'accepted')   as accepted_requests;

rollback;
