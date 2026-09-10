-- Phases 5 to 7: who a staff member is, what they are paid, and what they have
-- been granted access to. Applied to production 10 September 2026.
--
-- Specification 13: "Salary queries always include staff_id = auth.uid() on the
-- employee path" and "Nobody except the founder sees another person's amount."
-- Both are policies here, so an employee cannot read a colleague's pay by
-- calling the API directly however the interface is written.

create type public.staff_role as enum ('frontend','backend','mobile','design','qa','seo');
create type public.engagement_type as enum ('retainer_monthly','project_fee');
create type public.staff_status as enum ('invited','active','paused','ended');

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  -- One person may hold several roles. A sensitive module still needs its own
  -- grant: frontend plus mentor does not imply payroll.
  roles public.staff_role[] not null default '{}',
  is_mentor boolean not null default false,
  status public.staff_status not null default 'invited',
  started_on date,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index staff_profiles_user_idx on public.staff_profiles (user_id);
create trigger staff_profiles_updated before update on public.staff_profiles
for each row execute function public.set_updated_at();

-- Compensation, not "salary": a contracted builder on a project fee is not a
-- salaried employee, and calling every row salary would misdescribe most of
-- the people this studio works with.
create table public.compensation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  engagement public.engagement_type not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  cycle_label text,
  status text not null default 'active' check (status in ('active','paused','ended')),
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compensation_dates_ordered check (effective_to is null or effective_to >= effective_from)
);
create index compensation_user_idx on public.compensation (user_id, effective_from desc);
create trigger compensation_updated before update on public.compensation
for each row execute function public.set_updated_at();

create table public.compensation_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  compensation_id uuid not null references public.compensation on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','processing','paid')),
  due_on date, paid_on date, reference text,
  created_at timestamptz not null default now()
);
create index compensation_payments_comp_idx on public.compensation_payments (compensation_id, due_on desc);

-- The third leg of the access triplet from specification 4.2.
create table public.project_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  module text not null check (module in ('scope','source','staging','files','tickets','billing')),
  level text not null check (level in ('read','write','admin')),
  starts_at date not null default current_date,
  ends_at date,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, module)
);
create index project_grants_user_idx on public.project_grants (user_id);
create index project_grants_project_idx on public.project_grants (project_id);

alter table public.staff_profiles enable row level security;
alter table public.compensation enable row level security;
alter table public.compensation_payments enable row level security;
alter table public.project_grants enable row level security;

create policy "staff read own profile"
  on public.staff_profiles for select using (user_id = auth.uid());
create policy "admins manage staff profiles"
  on public.staff_profiles for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- The rule that matters most here. Read is own-rows-only; there is no staff
-- write path at all, so nobody can adjust their own pay.
create policy "staff read own compensation"
  on public.compensation for select using (user_id = auth.uid());
create policy "admins manage compensation"
  on public.compensation for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "staff read own payments"
  on public.compensation_payments for select
  using (exists (select 1 from public.compensation c
                 where c.id = compensation_payments.compensation_id and c.user_id = auth.uid()));
create policy "admins manage payments"
  on public.compensation_payments for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "staff read own grants"
  on public.project_grants for select using (user_id = auth.uid());
create policy "admins manage grants"
  on public.project_grants for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

comment on table public.compensation is
  'One row per engagement. Read is own-rows-only for staff; only an administrator writes.';
comment on table public.project_grants is
  'The third leg of the access triplet: which project, which module, at which level.';

-- Verified after applying with two people holding different amounts, every
-- probe row removed: each saw exactly their own compensation row and none of
-- the other payments; raising their own pay was refused; granting themselves
-- project access was refused with "new row violates row-level security policy".
