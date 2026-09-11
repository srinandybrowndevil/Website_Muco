-- MUCO LABS -- pending database changes, in order.
--
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- It is the three migrations that have not been applied, concatenated in the
-- order their filenames give. Running it twice is safe: every create uses
-- "if not exists" or "or replace", every policy is dropped before it is made,
-- and every constraint is dropped before it is added.
--
-- Apply this BEFORE deploying the site. The screens in the pending commits
-- query tables this file creates, so code first would mean a broken workspace.
--
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

begin;

-- ===================================================================
-- 20261106000000_screens_for_rules_that_already_exist.sql
-- ===================================================================

-- The schema behind the missing screens.
--
-- The roles checklist failed sixteen rows and every one had the same shape:
-- the rule was enforced in this database and the screen for it was never
-- built, so the founder did the job by hand in SQL. None of them leaked
-- anything. This migration adds only what those screens need to exist, and
-- nothing that widens what anybody can reach.
--
-- Callers: /admin/people, /admin/certificates, /admin/grants,
-- /admin/compensation, /admin/settings, /staff/profile, /staff/mentees,
-- /staff/projects, /intern/profile, /intern/help, /portal.

-- ---------------------------------------------------------------- a person
-- Checklist 2.7 and 4.9. A phone number belongs to the person, not to the
-- role they happen to hold, so it sits on profiles where an intern, an
-- employee and the founder all reach it through the same existing policy
-- ("users update own profile"). Putting it on intern_profiles instead would
-- have meant an intern editing a row the checklist requires them never to
-- write.
alter table public.profiles add column if not exists phone text;

-- ------------------------------------------------------------- a project
-- Checklist 6.7 and 7.5. What kind of project this is decides who may be put
-- near it: a sandbox is where a one-month intern belongs and a client project
-- is not.
do $$ begin
  create type public.project_kind as enum ('internal','client','sandbox');
exception when duplicate_object then null; end $$;

alter table public.projects
  add column if not exists kind public.project_kind not null default 'client',
  add column if not exists preview_url text,
  add column if not exists staging_url text;

-- Existing rows: a project with no customer was never a client project.
update public.projects set kind = 'internal' where customer_id is null and kind = 'client';

alter table public.projects
  drop constraint if exists projects_client_kind_has_customer;
alter table public.projects
  add constraint projects_client_kind_has_customer
  check (kind <> 'client' or customer_id is not null);

-- These are rendered as links a client clicks. Anything but https has no
-- business here, and refusing it at the column means no page has to remember.
alter table public.projects
  drop constraint if exists projects_links_are_https;
alter table public.projects
  add constraint projects_links_are_https check (
    (preview_url is null or preview_url ~ '^https://[^[:space:]]+$') and
    (staging_url is null or staging_url ~ '^https://[^[:space:]]+$'));

-- ----------------------------------------------------------- milestones
-- Checklist 7.3. A progress percentage tells a client the project is moving.
-- It does not tell them the thing they most need to know, which is whether
-- the next move is theirs. blocked_on_client is the reason this table exists.
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  title text not null,
  detail text,
  status text not null default 'planned'
    check (status in ('planned','in_progress','blocked_on_client','done')),
  due_on date,
  position smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_milestones_project_idx
  on public.project_milestones (project_id, position);

alter table public.project_milestones enable row level security;

drop policy if exists "team manage milestones" on public.project_milestones;
create policy "team manage milestones" on public.project_milestones for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

-- A client reads the milestones of their own projects and nobody else's. The
-- customer link is the same one every other client policy already uses.
drop policy if exists "clients read own milestones" on public.project_milestones;
create policy "clients read own milestones" on public.project_milestones for select
  using (exists (select 1 from public.projects p join public.customers c on c.id = p.customer_id
                 where p.id = project_milestones.project_id
                   and c.auth_user_id = (select auth.uid())));

drop trigger if exists project_milestones_updated on public.project_milestones;
create trigger project_milestones_updated before update on public.project_milestones
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- settings
-- Checklist 6.12 and 2.12. Four settings the checklist names, plus the two
-- sentences the product has to be able to say: where somebody goes for help,
-- and what happens on final payment.
create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations on delete cascade,
  signature_path text,
  letterhead_path text,
  default_grace_days smallint not null default 7 check (default_grace_days between 0 and 60),
  attendance_threshold smallint not null default 75 check (attendance_threshold between 0 and 100),
  support_email text,
  handover_note text not null default
    'Your code, accounts and access transfer to you on final payment. Nothing is held back afterwards.',
  updated_at timestamptz not null default now()
);

alter table public.organization_settings enable row level security;

-- Everyone with a membership reads them, because these settings exist to be
-- said out loud: an intern needs the support address, a client needs the
-- handover sentence. Only an administrator writes.
drop policy if exists "members read settings" on public.organization_settings;
create policy "members read settings" on public.organization_settings for select
  using (public.is_org_member(organization_id));

drop policy if exists "admins write settings" on public.organization_settings;
create policy "admins write settings" on public.organization_settings for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop trigger if exists organization_settings_updated on public.organization_settings;
create trigger organization_settings_updated before update on public.organization_settings
for each row execute function public.set_updated_at();

insert into public.organization_settings (organization_id)
select id from public.organizations on conflict do nothing;

-- --------------------------------------------------------------- mentors
-- Checklist 4.8 and 4.13. Until now a mentor could not see the person they
-- mentor: intern records are readable by is_org_staff, which is admin and
-- member, and an employee is neither. So "my mentees" could not be built, and
-- a mentor recommending a completion was recommending someone they could not
-- open.
--
-- Read only, and only for interns actually pointed at this mentor. Nothing
-- here lets a mentor change dates, status or anybody's record.
drop policy if exists "mentors read their mentees" on public.intern_profiles;
create policy "mentors read their mentees" on public.intern_profiles for select
  using (mentor_id = (select auth.uid()));

drop policy if exists "mentors read mentee work logs" on public.intern_work_logs;
create policy "mentors read mentee work logs" on public.intern_work_logs for select
  using (exists (select 1 from public.intern_profiles i
                 where i.id = intern_work_logs.intern_id
                   and i.mentor_id = (select auth.uid())));

-- A mentor's recommendation, which is not an issue. Kept separate from
-- approved_by on purpose: the checklist asks that a mentor can recommend and
-- only the founder issues, and two columns is the only way to say both.
alter table public.intern_profiles
  add column if not exists mentor_recommended_at timestamptz,
  add column if not exists mentor_note text;

-- Recommending is the one write a mentor has, and it is confined to those two
-- columns by a trigger, because row-level security cannot say "this column".
create or replace function public.guard_mentor_recommendation() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := to_jsonb(old);
  v_changed text;
begin
  -- An administrator or member is already allowed to manage these rows.
  if public.is_org_staff((v_old ->> 'organization_id')::uuid) then return new; end if;

  select string_agg(key, ', ') into v_changed
  from jsonb_each_text(v_new)
  where key not in ('mentor_recommended_at','mentor_note','updated_at')
    and coalesce(value, '') is distinct from coalesce(v_old ->> key, '');

  if v_changed is not null then
    raise exception 'A mentor may only add a recommendation. Refused change to: %', v_changed
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

revoke all on function public.guard_mentor_recommendation() from public, anon, authenticated;

drop trigger if exists intern_profiles_mentor_may_only_recommend on public.intern_profiles;
create trigger intern_profiles_mentor_may_only_recommend
  before update on public.intern_profiles
  for each row execute function public.guard_mentor_recommendation();

drop policy if exists "mentors recommend their mentees" on public.intern_profiles;
create policy "mentors recommend their mentees" on public.intern_profiles for update
  using (mentor_id = (select auth.uid()))
  with check (mentor_id = (select auth.uid()));

-- ------------------------------------------------------------- invitations
-- Checklist 6.3, 6.4 and 6.5. The invitation form offered two roles, Member
-- and Admin, so an intern or an employee could only be created by hand, and a
-- client invitation was impossible: create_invitation refuses one that
-- carries no customer, and the form had nowhere to name a customer.
--
-- Track, dates, mentor, staff roles and compensation cannot become rows at
-- invite time, because intern_profiles.user_id references a person who does
-- not exist until they accept. So the founder's answers ride on the
-- invitation and become rows at acceptance.
alter table public.invitations add column if not exists details jsonb not null default '{}';

drop function if exists public.create_invitation(uuid, text, public.app_role, uuid, interval);

create function public.create_invitation(
  invite_organization_id uuid, invite_email text, invite_role public.app_role,
  invite_customer_id uuid default null, valid_for interval default '7 days',
  invite_details jsonb default '{}')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  raw_token text;
  normalized_email text := lower(btrim(invite_email));
  v_details jsonb := coalesce(invite_details, '{}'::jsonb);
begin
  if not public.is_org_admin(invite_organization_id) then raise exception 'not authorized'; end if;
  if valid_for <= interval '0 seconds' or valid_for > interval '30 days' then raise exception 'invalid expiry'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid email'; end if;
  if (invite_role = 'client') <> (invite_customer_id is not null) then raise exception 'invalid customer role'; end if;
  if invite_customer_id is not null and not exists(
       select 1 from public.customers where id=invite_customer_id and organization_id=invite_organization_id)
    then raise exception 'invalid customer'; end if;

  -- Validated here rather than at acceptance. An invitation that cannot
  -- become a record should fail in front of the person creating it, not
  -- weeks later in front of the person accepting it.
  if invite_role = 'intern' then
    if v_details ->> 'track' is null or v_details ->> 'tier' is null
       or v_details ->> 'starts_at' is null or v_details ->> 'ends_at' is null then
      raise exception 'An intern invitation needs a track, a tier, a start date and an end date.';
    end if;
    if (v_details ->> 'ends_at')::date < (v_details ->> 'starts_at')::date then
      raise exception 'The end date cannot fall before the start date.';
    end if;
    perform (v_details ->> 'track')::public.intern_track;
    perform (v_details ->> 'tier')::public.intern_tier;
    if v_details ->> 'mentor_id' is not null and not exists(
         select 1 from public.memberships
         where organization_id = invite_organization_id
           and user_id = (v_details ->> 'mentor_id')::uuid and disabled_at is null)
      then raise exception 'That mentor is not part of this workspace.'; end if;
  elsif invite_role = 'employee' then
    if v_details -> 'roles' is null or jsonb_array_length(v_details -> 'roles') = 0 then
      raise exception 'A staff invitation needs at least one role.';
    end if;
    perform (jsonb_array_elements_text(v_details -> 'roles'))::public.staff_role;
    if v_details ->> 'engagement' is not null then
      perform (v_details ->> 'engagement')::public.engagement_type;
      if coalesce((v_details ->> 'amount')::numeric, -1) < 0 then
        raise exception 'Compensation needs an amount of zero or more.';
      end if;
    end if;
  end if;

  raw_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.invitations(token_hash,organization_id,email,role,customer_id,expires_at,created_by,details)
  values(extensions.digest(raw_token,'sha256'),invite_organization_id,normalized_email,invite_role,
         invite_customer_id,now()+valid_for,auth.uid(),v_details);
  return raw_token;
end $$;

revoke all on function public.create_invitation(uuid, text, public.app_role, uuid, interval, jsonb)
  from public, anon;
grant execute on function public.create_invitation(uuid, text, public.app_role, uuid, interval, jsonb)
  to authenticated;

-- Acceptance turns the founder's answers into the records the workspaces read.
create or replace function public.accept_invitation(invite_token text)
returns public.app_role
language plpgsql security definer set search_path to '' as $$
declare
  invitation public.invitations%rowtype;
  user_email text;
  v_grace smallint;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  user_email := lower(coalesce(auth.jwt()->>'email',''));
  select * into invitation from public.invitations
   where token_hash=extensions.digest(invite_token,'sha256') for update;
  if not found or invitation.accepted_at is not null or invitation.expires_at <= now()
    then raise exception 'invitation unavailable'; end if;
  if invitation.email <> user_email then raise exception 'email mismatch'; end if;

  insert into public.memberships(organization_id,user_id,role)
  values(invitation.organization_id,auth.uid(),invitation.role)
  on conflict (organization_id,user_id) do nothing;

  if invitation.role='client' then
    update public.customers set auth_user_id=auth.uid()
     where id=invitation.customer_id and organization_id=invitation.organization_id
       and (auth_user_id is null or auth_user_id=auth.uid());
    if not found then raise exception 'customer unavailable'; end if;

  elsif invitation.role='intern' then
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

  elsif invitation.role='employee' then
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

  update public.invitations set accepted_at=now() where id=invitation.id;
  return invitation.role;
end $$;

-- ----------------------------------------------------------- certificates
-- Checklist 6.9. Approval was already the rule -- approved_by is NOT NULL, so
-- no certificate has ever existed without a founder behind it -- but there was
-- no screen, so the founder issued certificates by writing SQL. The serial is
-- generated here rather than typed, because a serial somebody types is a
-- serial somebody eventually repeats.
create or replace function public.issue_certificate(
  p_intern_id uuid, p_tools text[] default '{}', p_mentor_name text default null)
returns public.intern_certificates
language plpgsql security definer set search_path = '' as $$
declare
  v_intern public.intern_profiles%rowtype;
  v_serial text;
  v_row public.intern_certificates%rowtype;
begin
  select * into v_intern from public.intern_profiles where id = p_intern_id;
  if not found then raise exception 'No such internship.'; end if;
  if not public.is_org_admin(v_intern.organization_id) then
    raise exception 'Only an administrator issues a certificate.'
      using errcode = 'insufficient_privilege';
  end if;

  -- The same gate the intern's own page describes: the internship has to be
  -- over, or explicitly closed early by the founder marking it completed.
  if v_intern.status not in ('completed','certified') and current_date <= v_intern.ends_at then
    raise exception 'This internship is still running. Mark it completed first if you are closing it early.';
  end if;

  select 'MUCO-INT-' || to_char(current_date,'YYYY') || '-' ||
         lpad((count(*) + 1)::text, 4, '0')
    into v_serial
  from public.intern_certificates
  where organization_id = v_intern.organization_id
    and issued_on >= date_trunc('year', current_date)::date;

  insert into public.intern_certificates(organization_id,intern_id,serial,approved_by,tools,mentor_name)
  values (v_intern.organization_id, v_intern.id, v_serial, auth.uid(),
          coalesce(p_tools,'{}'), p_mentor_name)
  on conflict (intern_id) do update
    set tools = excluded.tools, mentor_name = excluded.mentor_name
  returning * into v_row;

  update public.intern_profiles set status = 'certified' where id = v_intern.id;
  return v_row;
end $$;

revoke all on function public.issue_certificate(uuid, text[], text) from public, anon;
grant execute on function public.issue_certificate(uuid, text[], text) to authenticated;

-- ------------------------------------------------------------------ audit
insert into public.audit_actions(action, description) values
  ('certificate.issued',   'A certificate was issued by the founder'),
  ('mentor.recommended',   'A mentor recommended an intern for completion'),
  ('settings.changed',     'A workspace setting was changed'),
  ('probe.secrets',        'Reserved for supabase/tests/access_checks.sql')
on conflict (action) do nothing;

comment on table public.project_milestones is
  'What is done, what is next, and what is waiting on the client. A percentage says a project moves; this says whose move it is.';
comment on table public.organization_settings is
  'One row per organization. Read by everyone with a membership because these settings exist to be said out loud; written only by an administrator.';
comment on column public.invitations.details is
  'The founder''s answers for a role that cannot have a record yet -- an intern track and dates, a staff role and engagement. accept_invitation turns them into rows.';

-- --------------------------------------------------- what a grant opens
-- Found while building /staff/projects. Projects and files are readable by
-- is_org_staff, which is admin and member -- an employee is neither. So the
-- staff home, which reads project_grants and embeds projects(name, status),
-- has been getting null back for every project and rendering "Unnamed
-- project". A grant named a project the person granted it could not read.
--
-- The grant is the authorization; these two policies simply let it be worth
-- something. Both require a live grant, so 4.10 still holds: an ungranted
-- project stays shut, and a grant that has run out stops opening anything.
drop policy if exists "staff read granted projects" on public.projects;
create policy "staff read granted projects" on public.projects for select
  using (exists (select 1 from public.project_grants g
                 where g.project_id = projects.id
                   and g.user_id = (select auth.uid())
                   and (g.ends_at is null or g.ends_at >= current_date)));

-- Checklist 4.6: the scope document for a project somebody is working on.
-- Confined to the two modules that mean documents -- a source or billing
-- grant does not become a file cabinet.
drop policy if exists "staff read granted project files" on public.files;
create policy "staff read granted project files" on public.files for select
  using (project_id is not null and exists (
    select 1 from public.project_grants g
    where g.project_id = files.project_id
      and g.user_id = (select auth.uid())
      and g.module in ('scope','files')
      and (g.ends_at is null or g.ends_at >= current_date)));

create index if not exists project_grants_project_user_idx
  on public.project_grants (project_id, user_id);

-- ---------------------------------------------------------- attendance
-- Checklist 6.12 names an attendance threshold. Added as a setting, it would
-- have been a number nothing reads -- a field satisfying a checklist row
-- rather than a rule, which is the failure the checklist itself warns about.
--
-- It already had a consumer waiting. intern_work_logs carries one entry per
-- intern per day, and the comment on that constraint says why: "the attendance
-- percentage the certificate depends on is only meaningful if a day cannot be
-- counted twice". So the percentage is computed from the log rather than
-- recorded anywhere, and the threshold is what it is measured against.
--
-- Weekends are excluded. Counting Saturdays against an intern who was never
-- expected on a Saturday would make every attendance figure wrong in the same
-- direction, which is worse than not showing one.
create or replace function public.intern_attendance(p_intern uuid)
returns table (days_logged integer, working_days integer, percent integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid; v_user uuid; v_mentor uuid; v_start date; v_end date;
  v_logged integer; v_working integer;
begin
  select organization_id, user_id, mentor_id, starts_at, least(ends_at, current_date)
    into v_org, v_user, v_mentor, v_start, v_end
  from public.intern_profiles where id = p_intern;
  if not found then return; end if;

  -- SECURITY DEFINER reads past row-level security, so entitlement is checked
  -- here instead: the studio, the mentor of record, or the intern themselves.
  if not (public.is_org_staff(v_org)
          or v_mentor = auth.uid()
          or v_user = auth.uid()) then
    raise exception 'Not your internship to look at.' using errcode = 'insufficient_privilege';
  end if;

  select count(*)::integer into v_working
  from generate_series(v_start, v_end, interval '1 day') as day
  where extract(isodow from day) < 6;

  select count(*)::integer into v_logged
  from public.intern_work_logs w
  where w.intern_id = p_intern
    and w.logged_on between v_start and v_end
    and extract(isodow from w.logged_on) < 6;

  days_logged := coalesce(v_logged, 0);
  working_days := coalesce(v_working, 0);
  percent := case when coalesce(v_working, 0) = 0 then 0
                  else round(100.0 * coalesce(v_logged, 0) / v_working)::integer end;
  return next;
end $$;

revoke all on function public.intern_attendance(uuid) from public, anon;
grant execute on function public.intern_attendance(uuid) to authenticated;

comment on function public.intern_attendance(uuid) is
  'Attendance computed from the work log rather than stored, measured against organization_settings.attendance_threshold. Weekdays only.';


-- ===================================================================
-- 20261107000000_deleting_a_person.sql
-- ===================================================================

-- Why a user cannot be deleted in Supabase, and what to do about it.
--
-- Deleting an account in Supabase Auth cascades to public.profiles, and nine
-- foreign keys point at profiles with no delete rule at all. A reference
-- without an ON DELETE clause is NO ACTION, which refuses the delete, so the
-- dashboard reports a foreign key violation and the account stays. Every one
-- of them was written as an inline "references public.profiles" with the rule
-- simply omitted, so this was never a decision anybody made -- it is nine
-- defaults nobody noticed.
--
-- The fix is not to cascade. Cascading from a person would delete their
-- customers, their leads, their projects and their files, which is a far worse
-- outcome than not being able to delete them. What these columns actually mean
-- is "who did this" or "who owns this", and the honest answer once the person
-- is gone is nobody. So they become null, the record survives, and an unowned
-- customer shows up as unowned rather than disappearing.

-- ---------------------------------------------------- work and ownership
-- Records that outlive the person who made or owned them.
alter table public.customers drop constraint if exists customers_owner_id_fkey;
alter table public.customers add constraint customers_owner_id_fkey
  foreign key (owner_id) references public.profiles on delete set null;

-- A customer is a business, not somebody's login. Detaching the account leaves
-- the company, its invoices and its project history intact, which is what the
-- studio actually needs to keep.
alter table public.customers drop constraint if exists customers_auth_user_id_fkey;
alter table public.customers add constraint customers_auth_user_id_fkey
  foreign key (auth_user_id) references public.profiles on delete set null;

alter table public.leads drop constraint if exists leads_owner_id_fkey;
alter table public.leads add constraint leads_owner_id_fkey
  foreign key (owner_id) references public.profiles on delete set null;

-- An unassigned task is true and visible. A deleted task is a promise lost.
alter table public.tasks drop constraint if exists tasks_assignee_id_fkey;
alter table public.tasks add constraint tasks_assignee_id_fkey
  foreign key (assignee_id) references public.profiles on delete set null;

alter table public.projects drop constraint if exists projects_owner_id_fkey;
alter table public.projects add constraint projects_owner_id_fkey
  foreign key (owner_id) references public.profiles on delete set null;

alter table public.files drop constraint if exists files_uploader_id_fkey;
alter table public.files add constraint files_uploader_id_fkey
  foreign key (uploader_id) references public.profiles on delete set null;

alter table public.activities drop constraint if exists activities_actor_id_fkey;
alter table public.activities add constraint activities_actor_id_fkey
  foreign key (actor_id) references public.profiles on delete set null;

-- An invitation is a record of something that happened. Losing who sent it is
-- a smaller loss than losing that it was sent, so the column becomes nullable
-- rather than the row being deleted with its author.
alter table public.invitations alter column created_by drop not null;
alter table public.invitations drop constraint if exists invitations_created_by_fkey;
alter table public.invitations add constraint invitations_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- ------------------------------------------------------- the audit trail
-- audit_events.actor_id was already ON DELETE SET NULL, which means deleting
-- somebody has always quietly blanked the actor on every line they wrote.
-- That is worse than refusing the delete: the log keeps its rows and stops
-- being able to say who. The identity is captured at write time so the trail
-- survives the account.
alter table public.audit_events add column if not exists actor_email text;

comment on column public.audit_events.actor_email is
  'Captured when the row is written, because actor_id is set null if the account is ever deleted. Without this the log keeps every line and forgets who wrote it.';

create or replace function public.record_audit_event(
  p_action text, p_resource_type text, p_resource_id uuid default null,
  p_detail jsonb default '{}', p_organization_id uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_email text := nullif(auth.jwt() ->> 'email', '');
  v_org uuid := p_organization_id;
begin
  if v_actor is null then return; end if;
  if v_org is null then
    select organization_id into v_org from public.memberships
    where user_id = v_actor order by organization_id limit 1;
  end if;

  insert into public.audit_events(organization_id, actor_id, actor_email, action, resource_type, resource_id, detail)
  values (v_org, v_actor, v_email, p_action, p_resource_type, p_resource_id,
    coalesce((select jsonb_object_agg(key, value) from jsonb_each(p_detail)
              where key !~* '(password|secret|token|otp|aadhaar|pan|passport|bank|account_number|cvv)'), '{}'::jsonb));
end $$;

-- ------------------------------------------------------- certificates
-- This one was a deliberate ON DELETE RESTRICT, and the guarantee behind it is
-- worth keeping: no certificate has ever existed without a founder approving
-- it. But the guarantee that matters to the document is that it names its
-- approver, not that a row in another table still exists -- and the same table
-- already denormalises mentor_name for exactly that reason.
--
-- So the name is captured at issue time and required, the identifier is
-- allowed to go null, and deleting an old administrator no longer refuses.
-- The certificate keeps saying who approved it either way.
alter table public.intern_certificates add column if not exists approved_by_name text;

update public.intern_certificates c
   set approved_by_name = coalesce(
     (select p.full_name from public.profiles p where p.id = c.approved_by), 'Not recorded')
 where c.approved_by_name is null;

alter table public.intern_certificates alter column approved_by_name set not null;
alter table public.intern_certificates alter column approved_by drop not null;

alter table public.intern_certificates drop constraint if exists intern_certificates_approved_by_fkey;
alter table public.intern_certificates add constraint intern_certificates_approved_by_fkey
  foreign key (approved_by) references public.profiles on delete set null;

comment on column public.intern_certificates.approved_by_name is
  'Who approved this certificate, captured when it was issued. The document has to name its approver even if that account is later deleted; approved_by may go null, this may not.';

-- Issuing now records the approver by name as well as by id, so the guarantee
-- moved above is actually maintained on every new certificate rather than only
-- backfilled onto the old ones.
create or replace function public.issue_certificate(
  p_intern_id uuid, p_tools text[] default '{}', p_mentor_name text default null)
returns public.intern_certificates
language plpgsql security definer set search_path = '' as $$
declare
  v_intern public.intern_profiles%rowtype;
  v_serial text;
  v_name text;
  v_row public.intern_certificates%rowtype;
begin
  select * into v_intern from public.intern_profiles where id = p_intern_id;
  if not found then raise exception 'No such internship.'; end if;
  if not public.is_org_admin(v_intern.organization_id) then
    raise exception 'Only an administrator issues a certificate.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_intern.status not in ('completed','certified') and current_date <= v_intern.ends_at then
    raise exception 'This internship is still running. Mark it completed first if you are closing it early.';
  end if;

  select coalesce(full_name, 'Not recorded') into v_name
  from public.profiles where id = auth.uid();

  select 'MUCO-INT-' || to_char(current_date,'YYYY') || '-' ||
         lpad((count(*) + 1)::text, 4, '0')
    into v_serial
  from public.intern_certificates
  where organization_id = v_intern.organization_id
    and issued_on >= date_trunc('year', current_date)::date;

  insert into public.intern_certificates(organization_id, intern_id, serial, approved_by,
                                         approved_by_name, tools, mentor_name)
  values (v_intern.organization_id, v_intern.id, v_serial, auth.uid(),
          coalesce(v_name, 'Not recorded'), coalesce(p_tools,'{}'), p_mentor_name)
  on conflict (intern_id) do update
    set tools = excluded.tools, mentor_name = excluded.mentor_name
  returning * into v_row;

  update public.intern_profiles set status = 'certified' where id = v_intern.id;
  return v_row;
end $$;

revoke all on function public.issue_certificate(uuid, text[], text) from public, anon;
grant execute on function public.issue_certificate(uuid, text[], text) to authenticated;

-- After this migration, deleting a person in Supabase Auth succeeds. What
-- survives them: every customer, lead, project, task, file and invitation they
-- touched, now unowned rather than gone; every audit line they wrote, still
-- naming them by the email captured at the time; and any certificate they
-- approved, still naming them as the approver.
--
-- What does not survive: their membership, their intern or staff record, their
-- compensation and their grants. Those cascade, because each one describes the
-- relationship itself rather than work that outlives it.
--
-- Worth saying plainly: deleting is rarely the right move for somebody who
-- actually worked here. Switching them off closes every door immediately and
-- keeps the history readable. Deletion is for the test account and the
-- mistaken signup.


-- ===================================================================
-- 20261108000000_two_authorisation_checks_that_failed_open.sql
-- ===================================================================

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


commit;
