-- Analytics retention.
--
-- privacy.html tells visitors that first-party analytics data is "retained for
-- approximately 90 days and then deleted automatically". Until this migration
-- that was only a comment in 20261015000000_website_monitoring.sql: nothing
-- ever deleted a row, so the published privacy policy described behaviour the
-- database did not actually have. This adds the deletion and schedules it.
begin;

create or replace function public.crm_schema_version() returns integer
language sql stable set search_path='' as $$ select 8 $$;
revoke all on function public.crm_schema_version() from public;
grant execute on function public.crm_schema_version() to authenticated;

-- Deletes events past the retention window and reports how many went. Marked
-- security definer so the scheduler can run it without a per-row policy, and
-- granted to nobody: anon and authenticated must not be able to call it.
create or replace function public.purge_expired_analytics_events(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'retention window must be at least one day, got %', p_days;
  end if;
  delete from public.analytics_events
   where occurred_at < now() - make_interval(days => p_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end $$;

revoke all on function public.purge_expired_analytics_events(integer) from public;

-- Run it daily. pg_cron has to be enabled on the project first:
-- Dashboard -> Database -> Extensions -> pg_cron. If it is not enabled the
-- function still exists and this migration still succeeds, but nothing calls
-- it -- so warn loudly rather than leave the privacy promise quietly unmet.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'purge-analytics-events') then
      perform cron.unschedule('purge-analytics-events');
    end if;
    perform cron.schedule(
      'purge-analytics-events',
      '17 3 * * *',
      $job$select public.purge_expired_analytics_events(90)$job$
    );
    raise notice 'Scheduled purge-analytics-events daily at 03:17 UTC.';
  else
    raise warning 'pg_cron is NOT enabled, so analytics events will never be deleted. Enable it (Database -> Extensions -> pg_cron) and re-run this migration, otherwise privacy.html overstates what the system does.';
  end if;
end $$;

commit;

-- Verify afterwards:
--   select jobname, schedule, active from cron.job where jobname = 'purge-analytics-events';
--   select public.purge_expired_analytics_events(90);   -- safe to run by hand
