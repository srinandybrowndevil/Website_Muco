-- Run AFTER all migrations in a staging project. Everything rolls back.
-- Requires existing staff + customer accounts; substitutes their UUIDs below.
-- Run as postgres in the SQL Editor. Do not disable RLS to make tests pass.
begin;
do $$
declare policy_row record;
begin
  for policy_row in select * from pg_policies where schemaname='public' and tablename in ('leads','customers','tasks','projects','proposals','invoices','files') and cmd='ALL' loop
    if coalesce(policy_row.qual,'') like '%is_org_member%' then
      raise exception 'Unsafe broad membership policy remains on %', policy_row.tablename;
    end if;
  end loop;
  if (select public.crm_schema_version()) <> 7 then raise exception 'Wrong schema version'; end if;
  if not exists(select 1 from storage.buckets where id='crm-files' and public=false) then raise exception 'Private bucket missing'; end if;
  if (select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in ('leads','customers','tasks','projects','website_enquiries','project_requests','analytics_events')) <> 7 then raise exception 'Realtime publication incomplete'; end if;
end $$;

-- Uncomment and replace the UUID to verify a REAL customer session:
-- set local role authenticated;
-- select set_config('request.jwt.claims','{"sub":"CUSTOMER_AUTH_UUID","role":"authenticated"}',true);
-- select count(*) as must_be_zero from public.leads;
-- select count(*) as must_be_zero from public.tasks;
-- select count(*) as must_be_zero from public.website_enquiries;
-- select count(*) as must_be_zero from public.analytics_events;
-- select id,auth_user_id from public.customers; -- only this customer's row(s)
-- select id,customer_id from public.projects; -- only this customer's projects
-- insert into public.leads(organization_id,name) values('ORG_UUID','must fail');
-- Expected: RLS error. If it succeeds, do not deploy.
rollback;
