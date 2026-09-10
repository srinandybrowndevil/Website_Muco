-- QA audit, loop 1, finding F-01. Applied to production 10 September 2026.
--
-- record_audit_event() accepted any action string from any signed-in user, so
-- a client could write "founder.approved.everything" into the audit log, or
-- flood it to bury real entries. Two things held: the actor is forced to
-- auth.uid(), so nobody could be attributed an entry they did not cause, and
-- the table is append-only, so nothing existing could be altered or erased.
-- What failed was the vocabulary. An audit log that will record any claim is
-- not evidence.

-- The vocabulary as data, in the same spirit as the tier packs. Adding an
-- action is a deliberate migration rather than something a caller can do at
-- run time.
create table public.audit_actions (
  action text primary key,
  description text not null
);
alter table public.audit_actions enable row level security;
create policy "signed in read audit actions"
  on public.audit_actions for select to authenticated using (true);
create policy "admins manage audit actions"
  on public.audit_actions for all
  using (public.is_any_admin()) with check (public.is_any_admin());

insert into public.audit_actions(action, description) values
  ('compensation.view', 'Someone opened their own compensation'),
  ('certificate.view', 'An intern opened their certificate'),
  ('client_pii.view', 'Someone opened a client''s contact details'),
  ('audit.rate_limited', 'Further entries from this person were dropped for one minute');

-- The fifteen a trigger can raise, generated rather than typed out, so the
-- vocabulary cannot drift from the tables actually being guarded.
insert into public.audit_actions(action, description)
select op || '.' || tbl, initcap(op) || ' on ' || tbl
from unnest(array['insert','update','delete']) op
cross join unnest(array['compensation','project_grants','memberships',
                        'intern_certificates','intern_profiles']) tbl;

create or replace function public.record_audit_event(
  p_action text, p_resource_type text, p_resource_id uuid default null,
  p_detail jsonb default '{}', p_organization_id uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := p_organization_id;
  v_recent int;
begin
  if v_actor is null then return; end if;

  -- An action nobody declared is not recorded. Raising rather than dropping it
  -- silently: if a new surface forgets to register its action, that must be
  -- loud in development, not a quiet hole in the trail in production.
  if not exists (select 1 from public.audit_actions where action = p_action) then
    raise exception 'Unknown audit action %. Register it in public.audit_actions first.', p_action
      using errcode = 'check_violation';
  end if;

  -- A brake on flooding, well past what any real session produces, so it only
  -- trips on abuse or a runaway loop. The cap is per person: one noisy account
  -- cannot stop anyone else's actions being recorded.
  select count(*) into v_recent from public.audit_events
  where actor_id = v_actor and occurred_at > now() - interval '1 minute';
  if v_recent >= 200 then
    -- Recorded once, so the gap in the trail is itself visible as a gap.
    if v_recent = 200 then
      insert into public.audit_events(organization_id, actor_id, action, resource_type, detail)
      values (v_org, v_actor, 'audit.rate_limited', 'audit_events',
              jsonb_build_object('dropped_from', p_action));
    end if;
    return;
  end if;

  if v_org is null then
    select organization_id into v_org from public.memberships
    where user_id = v_actor order by organization_id limit 1;
  end if;

  insert into public.audit_events(organization_id, actor_id, action, resource_type, resource_id, detail)
  values (v_org, v_actor, p_action, p_resource_type, p_resource_id,
    coalesce((select jsonb_object_agg(key, value) from jsonb_each(p_detail)
              where key !~* '(password|secret|token|otp|aadhaar|pan|passport|bank|account_number|cvv)'), '{}'::jsonb));
end $$;

revoke all on function public.record_audit_event(text, text, uuid, jsonb, uuid) from public, anon;
grant execute on function public.record_audit_event(text, text, uuid, jsonb, uuid) to authenticated;

-- Finding F-02. audit_write() is a trigger function. Postgres already refuses a
-- direct call with "trigger functions can only be called as triggers", so this
-- was never exploitable, but it has no business on the public REST surface.
revoke all on function public.audit_write() from public, anon, authenticated;

comment on table public.audit_actions is
  'The vocabulary the audit log accepts. An action not listed here is refused.';

-- Verified after applying: the exact fabrication that succeeded before is now
-- refused by name; a declared action still records; 401 attempts from one
-- account store 200 entries plus one rate-limit marker; the marker appears
-- exactly once; the trigger path is unaffected by the vocabulary check.
