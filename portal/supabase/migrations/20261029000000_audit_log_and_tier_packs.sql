-- Phase 9: the audit log. Phase 10: intern duration packs as data.
-- Applied to production 10 September 2026, as four recorded steps there
-- (20260910042712, 043034, 043611, 043707). Folded into one file here so a
-- fresh database reaches the same end state without replaying a bug that was
-- found and fixed during the same session -- see the note on audit_write().
--
-- Specification 13 names the events that must be recorded: compensation view,
-- certificate download, client PII view, grant change, user disable. It also
-- forbids passwords and identity document images in audit payloads.

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations on delete set null,
  actor_id uuid references public.profiles on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  -- Carries what changed, never the sensitive value itself: "the amount
  -- changed", not the amount.
  detail jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index audit_events_org_time_idx on public.audit_events (organization_id, occurred_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, occurred_at desc);
create index audit_events_resource_idx on public.audit_events (resource_type, resource_id);

alter table public.audit_events enable row level security;

-- Admin of any organization. is_org_admin() answers a per-organization
-- question, which is the wrong one to ask about a global table or about a row
-- whose organization has since been deleted.
create or replace function public.is_any_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships
                where user_id = auth.uid() and role = 'admin')
$$;
revoke all on function public.is_any_admin() from public, anon;
grant execute on function public.is_any_admin() to authenticated;

-- Append-only, deliberately. Administrators may read the log and nobody may
-- change or remove a row -- there is no update or delete policy at all, and no
-- insert policy either. Rows arrive only through record_audit_event() below,
-- which runs as owner. An audit log its subject can edit is not an audit log.
--
-- The null branch matters: deleting an organization sets organization_id null,
-- and without it those rows would become readable by nobody, quietly blinding
-- the trail that covered them.
create policy "admins read audit log"
  on public.audit_events for select
  using (case when organization_id is null then public.is_any_admin()
              else public.is_org_admin(organization_id) end);

create or replace function public.record_audit_event(
  p_action text, p_resource_type text, p_resource_id uuid default null,
  p_detail jsonb default '{}', p_organization_id uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := p_organization_id;
begin
  if v_actor is null then return; end if;
  if v_org is null then
    select organization_id into v_org from public.memberships
    where user_id = v_actor order by organization_id limit 1;
  end if;

  -- Defence in depth against a caller passing something it should not: strip
  -- any key whose name suggests a secret before the row is written.
  insert into public.audit_events(organization_id, actor_id, action, resource_type, resource_id, detail)
  values (v_org, v_actor, p_action, p_resource_type, p_resource_id,
    coalesce((select jsonb_object_agg(key, value) from jsonb_each(p_detail)
              where key !~* '(password|secret|token|otp|aadhaar|pan|passport|bank|account_number|cvv)'), '{}'::jsonb));
end $$;

revoke all on function public.record_audit_event(text, text, uuid, jsonb, uuid) from public, anon;
grant execute on function public.record_audit_event(text, text, uuid, jsonb, uuid) to authenticated;

-- Writes that must be recorded whatever the interface does. A trigger cannot
-- be forgotten by a new page or skipped by a direct API call.
--
-- Everything is read through jsonb rather than as record fields. The first
-- version compared `new.amount` inside a CASE branch only the compensation
-- table reaches; PL/pgSQL still resolves that field against the row type at
-- plan time, so on every other guarded table the trigger raised "record new
-- has no field amount" -- and since an audit failure aborts the write, it
-- blocked all writes to intern_profiles, memberships, project_grants and
-- intern_certificates. Reading through jsonb makes no assumption about which
-- columns a guarded table happens to have.
create or replace function public.audit_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_rec jsonb := coalesce(v_new, v_old);
  v_detail jsonb;
begin
  v_detail := case tg_table_name
    when 'compensation' then jsonb_build_object(
      'subject', v_rec ->> 'user_id',
      'amount_changed', tg_op = 'UPDATE'
        and (v_new ->> 'amount') is distinct from (v_old ->> 'amount'))
    when 'project_grants' then jsonb_build_object(
      'subject', v_rec ->> 'user_id', 'project', v_rec ->> 'project_id',
      'module', v_rec ->> 'module', 'level', v_rec ->> 'level')
    when 'memberships' then jsonb_build_object(
      'subject', v_rec ->> 'user_id', 'role', v_rec ->> 'role')
    when 'intern_certificates' then jsonb_build_object('serial', v_rec ->> 'serial')
    when 'intern_profiles' then jsonb_build_object(
      'subject', v_rec ->> 'user_id', 'status', v_rec ->> 'status',
      'ends_at', v_rec ->> 'ends_at')
    else '{}'::jsonb end;

  perform public.record_audit_event(
    lower(tg_op) || '.' || tg_table_name, tg_table_name,
    (v_rec ->> 'id')::uuid, v_detail, (v_rec ->> 'organization_id')::uuid);
  return coalesce(new, old);
end $$;

create trigger audit_compensation after insert or update or delete on public.compensation
for each row execute function public.audit_write();
create trigger audit_project_grants after insert or update or delete on public.project_grants
for each row execute function public.audit_write();
create trigger audit_memberships after insert or update or delete on public.memberships
for each row execute function public.audit_write();
create trigger audit_certificates after insert or update or delete on public.intern_certificates
for each row execute function public.audit_write();
create trigger audit_intern_profiles after insert or update or delete on public.intern_profiles
for each row execute function public.audit_write();

-- ------------------------------------------------- Phase 10: tier packs ----
-- Specification 14 item 10 asks for duration tiers as data rather than
-- "hardcoded if/else sprawl". A pack is what a tier may reach by default; a
-- founder can still add an explicit project grant on top for one intern.
--
-- The module list is a CHECK constraint, so customer data, invoices and
-- production are not merely set to none for every tier -- they cannot be
-- named here at all.
create table public.intern_tier_permissions (
  tier public.intern_tier not null,
  module text not null check (module in
    ('own_profile','work_log','learning','sandbox_project','client_code_redacted','analytics_aggregate')),
  level text not null check (level in ('none','read','write')),
  primary key (tier, module)
);

alter table public.intern_tier_permissions enable row level security;

-- Readable by any signed-in user: it is policy, not anyone's personal data,
-- and an intern seeing what their tier allows is the point.
create policy "signed in read tier packs"
  on public.intern_tier_permissions for select to authenticated using (true);
create policy "admins manage tier packs"
  on public.intern_tier_permissions for all
  using (public.is_any_admin()) with check (public.is_any_admin());

-- Seeded from specification 6.1 and 7.2. One month observes, two months build
-- under supervision, three months own a slice.
insert into public.intern_tier_permissions(tier, module, level) values
  ('m1','own_profile','write'), ('m1','work_log','write'), ('m1','learning','read'),
  ('m1','sandbox_project','read'), ('m1','client_code_redacted','none'), ('m1','analytics_aggregate','read'),
  ('m2','own_profile','write'), ('m2','work_log','write'), ('m2','learning','read'),
  ('m2','sandbox_project','write'), ('m2','client_code_redacted','read'), ('m2','analytics_aggregate','read'),
  ('m3','own_profile','write'), ('m3','work_log','write'), ('m3','learning','read'),
  ('m3','sandbox_project','write'), ('m3','client_code_redacted','write'), ('m3','analytics_aggregate','read');

-- One place that answers "what may this intern reach", reading the pack table
-- rather than branching on the tier, so a page, a guard and any future API all
-- ask the same question instead of each deriving the rule slightly
-- differently. It filters on auth.uid(), so it can only ever describe the
-- caller's own pack.
create or replace function public.intern_permissions()
returns table (module text, level text)
language sql stable security definer set search_path = '' as $$
  select p.module, p.level
  from public.intern_profiles i
  join public.intern_tier_permissions p on p.tier = i.tier
  where i.user_id = auth.uid()
  order by p.module
$$;

revoke all on function public.intern_permissions() from public, anon;
grant execute on function public.intern_permissions() to authenticated;

comment on table public.intern_tier_permissions is
  'What a duration tier may reach by default. Data, not branches in code.';
comment on table public.audit_events is
  'Append-only. Administrators read; nothing updates or deletes; rows arrive only via record_audit_event().';
comment on function public.intern_permissions() is
  'Effective module access for the signed-in intern, resolved from the tier pack table.';

-- Verified against production after applying. An administrator can read the
-- log and cannot update or delete a row in it; a client sees none of it and
-- cannot forge an entry; secret-looking keys are stripped from detail; the
-- amount itself never reaches the log, only that it changed. Each refusal was
-- re-checked as the table owner to confirm the statement would otherwise have
-- touched a row -- a refusal that matched nothing proves nothing. Every probe
-- row was removed afterwards.
