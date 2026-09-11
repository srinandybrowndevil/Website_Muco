-- Two things the disable switch needs before anybody is given a button for it.
-- Applied to production 10 September 2026.
--
-- Callers: replaces public.audit_write(), already bound to triggers on
-- compensation, project_grants, memberships, intern_certificates and
-- intern_profiles; adds one trigger to public.memberships. API effect: an
-- UPDATE or DELETE on memberships that would leave an organization with no
-- active administrator now returns 23001. No columns are added; audit detail
-- for memberships gains a reason key. Raised by the roles verification
-- checklist, rows 6.6 and 11.6.
--
-- First: an organization must always keep one active administrator. Without
-- this the only founder can switch themselves off, and then cannot switch
-- themselves back on, because is_org_admin now reads disabled_at -- the very
-- change that makes the switch work is what would make it unrecoverable. The
-- same lockout arrives by demoting or deleting that row, so the rule covers
-- all three rather than only the new one.
--
-- Everything is read through jsonb. Referencing new.role in a trigger that
-- also fires on DELETE resolves the field against the row type at plan time
-- whether the branch is taken or not, which is what once blocked every write
-- to four tables here.
create or replace function public.keep_one_active_admin() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_new jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) end;
  v_old jsonb := to_jsonb(old);
  v_others int;
begin
  -- Only rows that are currently an active administrator can cause a lockout.
  if (v_old ->> 'role') <> 'admin' or (v_old ->> 'disabled_at') is not null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  -- Still an active administrator afterwards: nothing was lost.
  if tg_op = 'UPDATE'
     and (v_new ->> 'role') = 'admin' and (v_new ->> 'disabled_at') is null then
    return new;
  end if;

  select count(*) into v_others from public.memberships
   where organization_id = (v_old ->> 'organization_id')::uuid
     and role = 'admin' and disabled_at is null
     and user_id <> (v_old ->> 'user_id')::uuid;

  if v_others = 0 then
    raise exception 'This is the only active administrator. Make somebody else an administrator first, then come back.'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

revoke all on function public.keep_one_active_admin() from public, anon, authenticated;

create trigger memberships_keep_one_active_admin
  before update or delete on public.memberships
  for each row execute function public.keep_one_active_admin();

-- Second: the log has to say what happened. The existing trigger would write
-- "update.memberships", which is true and useless -- somebody reading the log
-- after an incident needs to see that access was switched off, and why.
--
-- This is otherwise the same function as before; only v_action, the reason in
-- the memberships detail, and this comment are new.
create or replace function public.audit_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_rec jsonb := coalesce(v_new, v_old);
  v_action text := lower(tg_op) || '.' || tg_table_name;
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
      'subject', v_rec ->> 'user_id', 'role', v_rec ->> 'role',
      'reason', v_rec ->> 'disabled_reason')
    when 'intern_certificates' then jsonb_build_object('serial', v_rec ->> 'serial')
    when 'intern_profiles' then jsonb_build_object(
      'subject', v_rec ->> 'user_id', 'status', v_rec ->> 'status',
      'ends_at', v_rec ->> 'ends_at')
    else '{}'::jsonb end;

  -- Access being switched off is its own event, not a row that happened to
  -- change. Specification 13 asks for it by name.
  if tg_table_name = 'memberships' and tg_op = 'UPDATE'
     and (v_new ->> 'disabled_at') is distinct from (v_old ->> 'disabled_at') then
    v_action := case when (v_new ->> 'disabled_at') is null
                     then 'membership.restored' else 'membership.disabled' end;
  end if;

  perform public.record_audit_event(
    v_action, tg_table_name,
    (v_rec ->> 'id')::uuid, v_detail, (v_rec ->> 'organization_id')::uuid);
  return coalesce(new, old);
end $$;

comment on function public.keep_one_active_admin() is
  'An organization always keeps one active administrator. Guards disabling, demoting and deleting the last one, because is_org_admin reads disabled_at and the lockout would be unrecoverable.';

-- Verified after applying, inside a transaction that was rolled back. As the
-- founder: switching the only administrator off, demoting them, and deleting
-- them were each refused with the message above. Switching a client off wrote
-- exactly one membership.disabled row carrying the reason given, and switching
-- them back on wrote exactly one membership.restored row.
