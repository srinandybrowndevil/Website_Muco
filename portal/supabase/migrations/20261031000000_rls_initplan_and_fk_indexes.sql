-- QA audit, loop 1, findings F-07 and F-08. One performance pass.
-- Applied to production 10 September 2026 as two recorded steps there
-- (20260910052629 and 20260910053001).
--
-- F-07. Every policy below called auth.uid() directly, so PostgreSQL
-- re-evaluated it for every row it tested. Wrapping it as (select auth.uid())
-- makes it an InitPlan -- computed once per statement, then reused. The value
-- cannot change mid-statement, so this is an optimisation and nothing else.
--
-- Deferred once, and the reason was sound: rewriting 23 access-control policies
-- risks opening a hole for a gain no current query feels. It is done here under
-- the condition that made deferring safe -- the full access probe suite is
-- re-run afterwards, so a rewrite that changes who can see what surfaces there
-- rather than in production. Eighteen checks were re-run and all passed,
-- including the intern date lockout, which is the subtlest of them: an active
-- intern can write a work log, an expired one cannot, and reads continue after
-- the window closes.
--
-- The whole file is one transaction. There is no moment when a table sits
-- unprotected.

-- ---------------------------------------------------------------- activities
drop policy "staff add activities" on public.activities;
create policy "staff add activities" on public.activities
  for insert to authenticated
  with check (is_org_staff(organization_id) and (actor_id = (select auth.uid())));

-- ---------------------------------------------------------- analytics_events
drop policy "staff view analytics events" on public.analytics_events;
create policy "staff view analytics events" on public.analytics_events
  for select using (exists ( select 1
     from memberships m
    where ((m.organization_id = analytics_events.organization_id)
      and (m.user_id = (select auth.uid()))
      and (m.role = any (array['admin'::app_role, 'member'::app_role])))));

-- -------------------------------------------------------------- compensation
drop policy "staff read own compensation" on public.compensation;
create policy "staff read own compensation" on public.compensation
  for select using (user_id = (select auth.uid()));

drop policy "staff read own payments" on public.compensation_payments;
create policy "staff read own payments" on public.compensation_payments
  for select using (exists ( select 1
     from compensation c
    where ((c.id = compensation_payments.compensation_id)
      and (c.user_id = (select auth.uid())))));

-- ----------------------------------------------------------------- customers
drop policy "clients view own customer" on public.customers;
create policy "clients view own customer" on public.customers
  for select using (auth_user_id = (select auth.uid()));

-- --------------------------------------------------------------------- files
drop policy "clients view files" on public.files;
create policy "clients view files" on public.files
  for select using ((kind = 'document'::text) and (exists ( select 1
     from customers c
    where ((c.id = files.customer_id)
      and (c.auth_user_id = (select auth.uid()))))));

-- ------------------------------------------------------------------- interns
drop policy "interns read own certificate" on public.intern_certificates;
create policy "interns read own certificate" on public.intern_certificates
  for select using (exists ( select 1
     from intern_profiles i
    where ((i.id = intern_certificates.intern_id)
      and (i.user_id = (select auth.uid())))));

drop policy "interns view own profile" on public.intern_profiles;
create policy "interns view own profile" on public.intern_profiles
  for select using (user_id = (select auth.uid()));

drop policy "interns read own work log" on public.intern_work_logs;
create policy "interns read own work log" on public.intern_work_logs
  for select using (exists ( select 1
     from intern_profiles i
    where ((i.id = intern_work_logs.intern_id)
      and (i.user_id = (select auth.uid())))));

-- The date lockout stays exactly where it was: writing needs an active window,
-- amending needs an active window, and neither is reachable once it closes.
drop policy "interns write own work log while active" on public.intern_work_logs;
create policy "interns write own work log while active" on public.intern_work_logs
  for insert with check (exists ( select 1
     from intern_profiles i
    where ((i.id = intern_work_logs.intern_id)
      and (i.user_id = (select auth.uid()))
      and (i.organization_id = intern_work_logs.organization_id)
      and (( select intern_access.state
               from intern_access((select auth.uid())) intern_access(state, ends_at, days_left)) = 'active'::text))));

drop policy "interns amend own work log while active" on public.intern_work_logs;
create policy "interns amend own work log while active" on public.intern_work_logs
  for update using (exists ( select 1
     from intern_profiles i
    where ((i.id = intern_work_logs.intern_id)
      and (i.user_id = (select auth.uid()))
      and (( select intern_access.state
               from intern_access((select auth.uid())) intern_access(state, ends_at, days_left)) = 'active'::text))))
  with check (exists ( select 1
     from intern_profiles i
    where ((i.id = intern_work_logs.intern_id)
      and (i.user_id = (select auth.uid())))));

-- ------------------------------------------------------------------ invoices
drop policy "clients view invoices" on public.invoices;
create policy "clients view invoices" on public.invoices
  for select using (exists ( select 1
     from customers c
    where ((c.id = invoices.customer_id)
      and (c.auth_user_id = (select auth.uid())))));

-- --------------------------------------------------------------- memberships
drop policy "own membership or staff directory" on public.memberships;
create policy "own membership or staff directory" on public.memberships
  for select to authenticated
  using ((user_id = (select auth.uid())) or is_org_staff(organization_id));

-- ------------------------------------------------------------------ profiles
drop policy "own profile or staff directory" on public.profiles;
create policy "own profile or staff directory" on public.profiles
  for select to authenticated
  using ((id = (select auth.uid())) or (exists ( select 1
     from memberships m
    where ((m.user_id = profiles.id) and is_org_staff(m.organization_id)))));

drop policy "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update using (id = (select auth.uid()));

-- ------------------------------------------------------------ project_grants
drop policy "staff read own grants" on public.project_grants;
create policy "staff read own grants" on public.project_grants
  for select using (user_id = (select auth.uid()));

-- ---------------------------------------------------------- project_requests
drop policy "clients create own requests" on public.project_requests;
create policy "clients create own requests" on public.project_requests
  for insert with check ((status = 'new'::project_request_status) and (exists ( select 1
     from customers c
    where ((c.id = project_requests.customer_id)
      and (c.auth_user_id = (select auth.uid()))
      and (c.organization_id = project_requests.organization_id)))));

drop policy "clients view own requests" on public.project_requests;
create policy "clients view own requests" on public.project_requests
  for select using (exists ( select 1
     from customers c
    where ((c.id = project_requests.customer_id)
      and (c.auth_user_id = (select auth.uid())))));

drop policy "staff manage requests" on public.project_requests;
create policy "staff manage requests" on public.project_requests
  for all using (exists ( select 1
     from memberships m
    where ((m.organization_id = project_requests.organization_id)
      and (m.user_id = (select auth.uid()))
      and (m.role = any (array['admin'::app_role, 'member'::app_role])))))
  with check (exists ( select 1
     from memberships m
    where ((m.organization_id = project_requests.organization_id)
      and (m.user_id = (select auth.uid()))
      and (m.role = any (array['admin'::app_role, 'member'::app_role])))));

-- ------------------------------------------------------- projects, proposals
drop policy "clients view projects" on public.projects;
create policy "clients view projects" on public.projects
  for select using (exists ( select 1
     from customers c
    where ((c.id = projects.customer_id)
      and (c.auth_user_id = (select auth.uid())))));

drop policy "clients view proposals" on public.proposals;
create policy "clients view proposals" on public.proposals
  for select using (exists ( select 1
     from customers c
    where ((c.id = proposals.customer_id)
      and (c.auth_user_id = (select auth.uid())))));

-- ------------------------------------------------------------ staff_profiles
drop policy "staff read own profile" on public.staff_profiles;
create policy "staff read own profile" on public.staff_profiles
  for select using (user_id = (select auth.uid()));

-- --------------------------------------------------------- website_enquiries
drop policy "staff manage website enquiries" on public.website_enquiries;
create policy "staff manage website enquiries" on public.website_enquiries
  for all using (exists ( select 1
     from memberships m
    where ((m.organization_id = website_enquiries.organization_id)
      and (m.user_id = (select auth.uid()))
      and (m.role = any (array['admin'::app_role, 'member'::app_role])))))
  with check (exists ( select 1
     from memberships m
    where ((m.organization_id = website_enquiries.organization_id)
      and (m.user_id = (select auth.uid()))
      and (m.role = any (array['admin'::app_role, 'member'::app_role])))));

-- ---------------------------------------------------------------------------
-- F-08. Twenty-one foreign keys had no covering index. Without one, PostgreSQL
-- scans the whole child table to answer "which rows point at this parent",
-- which is what every delete of a parent row asks, and what most of the joins
-- these workspaces issue ask too.
--
-- Every index covers a real foreign key, so none is speculative. They do cost
-- a little write time on each insert, which is the honest trade: this database
-- already carries unused indexes and does not need more guesses. If write
-- volume ever grows enough to feel it, drop the ones whose parent rows are
-- never deleted and never joined backwards.

create index if not exists activities_actor_idx on public.activities (actor_id);
create index if not exists compensation_org_idx on public.compensation (organization_id);
create index if not exists compensation_payments_org_idx on public.compensation_payments (organization_id);
create index if not exists customers_owner_idx on public.customers (owner_id);
create index if not exists files_project_idx on public.files (project_id);
create index if not exists files_uploader_idx on public.files (uploader_id);
create index if not exists intern_certificates_approved_by_idx on public.intern_certificates (approved_by);
create index if not exists intern_profiles_mentor_idx on public.intern_profiles (mentor_id);
create index if not exists intern_work_logs_org_idx on public.intern_work_logs (organization_id);
create index if not exists invitations_created_by_idx on public.invitations (created_by);
create index if not exists invitations_customer_idx on public.invitations (customer_id);
create index if not exists invoices_project_idx on public.invoices (project_id);
create index if not exists leads_owner_idx on public.leads (owner_id);
create index if not exists project_grants_org_idx on public.project_grants (organization_id);
create index if not exists project_requests_converted_lead_idx on public.project_requests (converted_lead_id);
create index if not exists project_requests_converted_project_idx on public.project_requests (converted_project_id);
create index if not exists projects_owner_idx on public.projects (owner_id);
create index if not exists proposals_lead_idx on public.proposals (lead_id);
create index if not exists tasks_assignee_idx on public.tasks (assignee_id);
create index if not exists tasks_customer_idx on public.tasks (customer_id);
create index if not exists tasks_lead_idx on public.tasks (lead_id);
