-- Phase 3 and 4: the daily work log an intern keeps, and the certificate the
-- founder issues at the end. Applied to production 10 September 2026.

create table public.intern_work_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  intern_id uuid not null references public.intern_profiles on delete cascade,
  logged_on date not null default current_date,
  summary text not null check (length(btrim(summary)) between 1 and 2000),
  hours numeric(4,1) check (hours is null or (hours > 0 and hours <= 24)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One entry per day per intern: the attendance percentage the certificate
  -- depends on is only meaningful if a day cannot be counted twice.
  unique (intern_id, logged_on)
);

create index intern_work_logs_intern_idx on public.intern_work_logs (intern_id, logged_on desc);
create trigger intern_work_logs_updated before update on public.intern_work_logs
for each row execute function public.set_updated_at();

alter table public.intern_work_logs enable row level security;

-- Writes stop when the internship ends even though reads continue: the grace
-- period exists for collecting a certificate, not for backfilling work.
create policy "interns read own work log"
  on public.intern_work_logs for select
  using (exists (select 1 from public.intern_profiles i
                 where i.id = intern_work_logs.intern_id and i.user_id = auth.uid()));

create policy "interns write own work log while active"
  on public.intern_work_logs for insert
  with check (exists (select 1 from public.intern_profiles i
    where i.id = intern_work_logs.intern_id and i.user_id = auth.uid()
      and i.organization_id = intern_work_logs.organization_id
      and (select state from public.intern_access(auth.uid())) = 'active'));

create policy "interns amend own work log while active"
  on public.intern_work_logs for update
  using (exists (select 1 from public.intern_profiles i
    where i.id = intern_work_logs.intern_id and i.user_id = auth.uid()
      and (select state from public.intern_access(auth.uid())) = 'active'))
  with check (exists (select 1 from public.intern_profiles i
    where i.id = intern_work_logs.intern_id and i.user_id = auth.uid()));

create policy "staff manage work logs"
  on public.intern_work_logs for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

create table public.intern_certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  intern_id uuid not null references public.intern_profiles on delete restrict,
  serial text not null,
  issued_on date not null default current_date,
  approved_by uuid not null references public.profiles on delete restrict,
  tools text[] not null default '{}',
  mentor_name text,
  document_hash text,
  created_at timestamptz not null default now(),
  unique (organization_id, serial),
  -- One certificate per internship. A second is a reissue of the same serial,
  -- not a new award.
  unique (intern_id)
);

create index intern_certificates_serial_idx on public.intern_certificates (serial);
alter table public.intern_certificates enable row level security;

-- Issuing is an administrator's act. Specification 8.1 requires founder
-- approval; a mentor's recommendation alone is not enough, and an intern has
-- no write path at all.
create policy "interns read own certificate"
  on public.intern_certificates for select
  using (exists (select 1 from public.intern_profiles i
                 where i.id = intern_certificates.intern_id and i.user_id = auth.uid()));

create policy "admins issue certificates"
  on public.intern_certificates for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Public verification, exactly the fields section 8.2 permits. SECURITY
-- DEFINER because the reader is anonymous by design; it returns one row for one
-- serial rather than exposing the table.
create or replace function public.verify_certificate(p_serial text)
returns table (serial text, holder text, track text, starts_at date, ends_at date, issued_on date, status text)
language sql stable security definer set search_path = '' as $$
  select c.serial,
         coalesce(p.full_name, 'Not recorded'),
         replace(i.track::text, 'intern_', ''),
         i.starts_at, i.ends_at, c.issued_on,
         i.status::text
  from public.intern_certificates c
  join public.intern_profiles i on i.id = c.intern_id
  left join public.profiles p on p.id = i.user_id
  where upper(btrim(c.serial)) = upper(btrim(p_serial))
  limit 1
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;

comment on function public.verify_certificate(text) is
  'Public certificate check. Returns only the fields specification 8.2 allows on the verify page.';

-- Verified after applying, as the intern's own JWT, every probe row removed:
--   write work log during grace   refused
--   write work log while active   allowed
--   intern issues own certificate refused
--   intern extends own dates      refused
