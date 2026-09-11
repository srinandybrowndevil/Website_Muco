-- Intern workspace foundation: who an intern is, when their access starts and
-- ends, and what they may read. Applied to production 10 September 2026.
--
-- Specification section 7.1: access is denied before starts_at and after the
-- grace window, and an intern may never edit their own dates. Both are enforced
-- here rather than in the interface, because "the page does not show it" is not
-- access control.

create type public.intern_track as enum
  ('intern_frontend','intern_backend','intern_mobile','intern_design','intern_qa','intern_seo');
create type public.intern_tier as enum ('m1','m2','m3');
create type public.intern_status as enum
  ('invited','active','completed','certified','expired','dismissed');

create table public.intern_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  track public.intern_track not null,
  -- The tier picks the default permission pack. Real dates are what the lockout
  -- reads, so a six-week internship is expressed as dates, not a new tier.
  tier public.intern_tier not null,
  starts_at date not null,
  ends_at date not null,
  mentor_id uuid references public.profiles on delete set null,
  college text,
  status public.intern_status not null default 'invited',
  -- Founder-adjustable per intern; the default matches assumption A3.
  grace_days smallint not null default 7 check (grace_days between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intern_dates_ordered check (ends_at >= starts_at),
  unique (organization_id, user_id)
);

create index intern_profiles_user_idx on public.intern_profiles (user_id);
create index intern_profiles_org_status_idx on public.intern_profiles (organization_id, status);

create trigger intern_profiles_updated before update on public.intern_profiles
for each row execute function public.set_updated_at();

-- Access window, in one place. Anything that needs to know whether an intern
-- may act asks this rather than re-deriving the rule and getting it subtly
-- different, which is how the workspace guards drifted apart before.
create or replace function public.intern_access(p_user uuid)
returns table (state text, ends_at date, days_left integer)
language sql stable security definer set search_path = '' as $$
  select
    case
      when i.status in ('dismissed','expired') then 'closed'
      when current_date < i.starts_at                 then 'not_started'
      when current_date <= i.ends_at                  then 'active'
      when current_date <= i.ends_at + i.grace_days   then 'grace'
      else 'closed'
    end,
    i.ends_at,
    (i.ends_at - current_date)::integer
  from public.intern_profiles i
  where i.user_id = p_user
  order by i.created_at desc
  limit 1
$$;

revoke all on function public.intern_access(uuid) from public, anon;
grant execute on function public.intern_access(uuid) to authenticated;

alter table public.intern_profiles enable row level security;

-- An intern reads their own record and can never write it: dates, track, tier,
-- mentor and status are all set by staff. There is deliberately no intern
-- policy for insert, update or delete.
create policy "interns view own profile"
  on public.intern_profiles for select
  using (user_id = auth.uid());

create policy "staff manage intern profiles"
  on public.intern_profiles for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

comment on table public.intern_profiles is
  'One record per internship. Dates drive the lockout; interns may read but never write it.';

-- Verified after applying, each scenario inserted and removed:
--   starts tomorrow -> not_started   running now -> active
--   last day        -> active        inside grace -> grace
--   past grace      -> closed        dismissed    -> closed
