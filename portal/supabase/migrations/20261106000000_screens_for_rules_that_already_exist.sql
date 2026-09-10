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
