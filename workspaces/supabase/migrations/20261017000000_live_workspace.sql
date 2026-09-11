-- Staff writes, customer isolation, private files, live totals and replication.
begin;

create or replace function public.crm_schema_version() returns integer
language sql stable set search_path='' as $$ select 7 $$;
revoke all on function public.crm_schema_version() from public;
grant execute on function public.crm_schema_version() to authenticated;

create or replace function public.is_org_staff(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships where organization_id=org and user_id=auth.uid() and role in ('admin','member'))
$$;
revoke all on function public.is_org_staff(uuid) from public;
grant execute on function public.is_org_staff(uuid) to authenticated;

-- The original "member" helper includes customers. Keep it for organization
-- visibility, but never use it to authorize staff CRM operations.
do $$
declare t text;
begin
  foreach t in array array['customers','leads','tasks','projects','proposals','invoices','files'] loop
    execute format('drop policy if exists %I on public.%I', 'members manage ' || t, t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id))', 'staff manage ' || t, t);
  end loop;
end $$;
drop policy if exists "members view activities" on public.activities;
create policy "staff view activities" on public.activities for select to authenticated using(public.is_org_staff(organization_id));
drop policy if exists "members add activities" on public.activities;
create policy "staff add activities" on public.activities for insert to authenticated with check(public.is_org_staff(organization_id) and actor_id=auth.uid());
drop policy if exists "members view automations" on public.automations;
create policy "staff view automations" on public.automations for select to authenticated using(public.is_org_staff(organization_id));
drop policy if exists "members view memberships" on public.memberships;
create policy "own membership or staff directory" on public.memberships for select to authenticated using(user_id=auth.uid() or public.is_org_staff(organization_id));
drop policy if exists "users view own profile or colleagues" on public.profiles;
create policy "own profile or staff directory" on public.profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.memberships m where m.user_id=profiles.id and public.is_org_staff(m.organization_id)));

-- Reject cross-organization relationships even when a staff user knows a UUID.
create or replace function public.check_crm_relationships() returns trigger
language plpgsql security definer set search_path='' as $$
declare pair text[]; related_org uuid; related_id uuid; body jsonb := to_jsonb(new);
begin
  foreach pair slice 1 in array array[['customer_id','customers'],['lead_id','leads'],['project_id','projects']] loop
    related_id := nullif(body->>pair[1],'')::uuid;
    if related_id is not null then
      execute format('select organization_id from public.%I where id=$1',pair[2]) into related_org using related_id;
      if related_org is distinct from new.organization_id then raise exception 'Related record belongs to a different workspace'; end if;
    end if;
  end loop;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['tasks','projects','proposals','invoices','files'] loop
    execute format('create trigger crm_relationships before insert or update on public.%I for each row execute function public.check_crm_relationships()',t);
  end loop;
end $$;

create or replace function public.crm_overview(org uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
  if not public.is_org_staff(org) then raise exception 'Staff access required'; end if;
  return jsonb_build_object(
    'pipeline_value',(select coalesce(sum(estimated_value),0) from public.leads where organization_id=org and stage not in ('won','lost')),
    'active_projects',(select count(*) from public.projects where organization_id=org and status='active'),
    'outstanding',(select coalesce(sum(amount),0) from public.invoices where organization_id=org and status in ('sent','viewed','overdue')),
    'open_tasks',(select count(*) from public.tasks where organization_id=org and status='open'),
    'customers',(select count(*) from public.customers where organization_id=org),
    'enquiries',(select count(*) from public.website_enquiries where organization_id=org and status='new'),
    'stages',(select coalesce(jsonb_agg(row_to_json(s)),'[]'::jsonb) from (
      select stage,count(*) as count,sum(estimated_value) as value from public.leads where organization_id=org group by stage order by stage
    ) s)
  );
end $$;
revoke all on function public.crm_overview(uuid) from public;
grant execute on function public.crm_overview(uuid) to authenticated;

-- Files are private. Object keys start with their workspace UUID. A customer
-- download additionally needs an authorized metadata row assigned to them.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('crm-files','crm-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;
create policy "crm staff upload" on storage.objects for insert to authenticated
with check(bucket_id='crm-files' and exists(select 1 from public.memberships m where m.organization_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role in ('admin','member')));
create policy "crm authorized download" on storage.objects for select to authenticated
using(bucket_id='crm-files' and (
  exists(select 1 from public.memberships m where m.organization_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role in ('admin','member'))
  or exists(select 1 from public.files f join public.customers c on c.id=f.customer_id where f.bucket=storage.objects.bucket_id and f.path=storage.objects.name and c.auth_user_id=auth.uid())
));
create policy "crm staff remove" on storage.objects for delete to authenticated
using(bucket_id='crm-files' and exists(select 1 from public.memberships m where m.organization_id::text=(storage.foldername(name))[1] and m.user_id=auth.uid() and m.role in ('admin','member')));

-- A concrete automation: one next-day follow-up for each new lead while the
-- workspace rule is enabled. No emails are sent by this database trigger.
create or replace function public.create_lead_followup() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.automations where organization_id=new.organization_id and trigger_type='lead_created_followup' and enabled) then
    insert into public.tasks(organization_id,lead_id,title,description,due_at)
    values(new.organization_id,new.id,'Follow up: ' || new.name,'Review the new lead and record the next action.',now()+interval '1 day');
  end if;
  return new;
end $$;
create trigger lead_followup after insert on public.leads for each row execute function public.create_lead_followup();
create unique index automations_lead_followup_unique on public.automations(organization_id,trigger_type) where trigger_type='lead_created_followup';

do $$ declare t text; begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['leads','customers','tasks','projects','proposals','invoices','files','automations','memberships','invitations','website_enquiries','project_requests','analytics_events'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
commit;
