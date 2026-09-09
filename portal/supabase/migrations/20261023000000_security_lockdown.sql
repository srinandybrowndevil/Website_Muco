-- Closes an exploitable hole found by auditing function grants against
-- function bodies. Applied to production on 9 September 2026.
--
-- purge_expired_analytics_events was SECURITY DEFINER, granted to anon, and
-- validated only that the retention window was at least one day. The anon key
-- ships in the public site's JavaScript, so anyone could POST
-- /rest/v1/rpc/purge_expired_analytics_events with p_days = 1 and delete every
-- analytics event older than a day. Nothing in the function stopped them.
--
-- Two independent fixes, because either alone would suffice and both is
-- correct: the function refuses a signed-in caller who is not an admin, and the
-- EXECUTE grant is withdrawn from the browser-reachable roles so the endpoint
-- is not callable with a publishable key at all.

create or replace function public.purge_expired_analytics_events(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted integer;
  v_actor uuid := auth.uid();
begin
  if p_days is null or p_days < 1 then
    raise exception 'retention window must be at least one day, got %', p_days;
  end if;

  -- A NULL actor is the service role or a scheduled job, the intended caller.
  -- Any real signed-in user must be an administrator somewhere.
  if v_actor is not null and not exists (
    select 1 from public.memberships m
    where m.user_id = v_actor and m.role = 'admin'
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.analytics_events
   where occurred_at < now() - make_interval(days => p_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end $function$;

revoke all on function public.purge_expired_analytics_events(integer) from public, anon, authenticated;

-- Trigger functions were reachable as RPC endpoints. A trigger fires with the
-- table owner's rights and does not consult these grants, so withdrawing them
-- removes the endpoints without affecting the triggers. Verified after applying:
-- set_updated_at still fires on update.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_lead_followup() from public, anon, authenticated;
revoke all on function public.check_crm_relationships() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Deliberately NOT revoked: is_org_admin / is_org_member / is_org_staff.
-- The database linter flags them as anon-executable, but they read auth.uid()
-- and return false for an anonymous caller, so they leak nothing. The policies
-- that call them on organizations, memberships, invitations and automations are
-- declared TO public, so removing the grant would break signed-in reads and the
-- invite flow to buy no security.
