-- The records behind the eight pages section 11 asks for and the product does
-- not yet have: intern tasks and learning, a staff task list and document
-- store. Nothing here widens access. Every table below is read by its owner
-- and by the studio, and by nobody else.

-- ------------------------------------------------------------------ tasks
-- Section 11.3 item 3 and 11.4 item 4: "assigned tickets only". The table
-- exists and points at customers and leads, which is the sales side of the
-- studio. A task somebody works on belongs to a project, so that link is
-- added rather than a second task table invented.
alter table public.tasks add column if not exists project_id uuid
  references public.projects on delete cascade;
create index if not exists tasks_assignee_open_idx
  on public.tasks (assignee_id) where status = 'open';

-- An assignee reads the tasks assigned to them. Not the project's other
-- tasks, not anybody else's -- section 6.1 says assigned tickets only.
drop policy if exists "assignees read own tasks" on public.tasks;
create policy "assignees read own tasks" on public.tasks for select
  using (assignee_id = (select auth.uid()));

-- And may close one. Everything else about a task -- who it belongs to, what
-- it says, when it is due -- stays with the studio.
create or replace function public.guard_task_selfservice() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := to_jsonb(old);
  v_changed text;
begin
  if public.is_org_staff((v_old ->> 'organization_id')::uuid) then return new; end if;

  select string_agg(key, ', ') into v_changed
  from jsonb_each_text(v_new)
  where key not in ('status','completed_at')
    and coalesce(value, '') is distinct from coalesce(v_old ->> key, '');

  if v_changed is not null then
    raise exception 'You may only mark a task done. Refused change to: %', v_changed
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

revoke all on function public.guard_task_selfservice() from public, anon, authenticated;

drop trigger if exists tasks_assignee_may_only_close on public.tasks;
create trigger tasks_assignee_may_only_close before update on public.tasks
  for each row execute function public.guard_task_selfservice();

drop policy if exists "assignees close own tasks" on public.tasks;
create policy "assignees close own tasks" on public.tasks for update
  using (assignee_id = (select auth.uid()))
  with check (assignee_id = (select auth.uid()));

-- --------------------------------------------------------------- learning
-- Section 11.3 item 5: "assigned material only". Two tables rather than one,
-- because the same reading list is given to many interns and the spec is
-- explicit that an intern sees what is assigned to them, not a library.
create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  title text not null,
  summary text,
  url text check (url is null or url ~ '^https://[^[:space:]]+$'),
  track public.intern_track,
  minutes smallint check (minutes is null or minutes between 1 and 600),
  created_at timestamptz not null default now()
);

create table if not exists public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  material_id uuid not null references public.learning_materials on delete cascade,
  intern_id uuid not null references public.intern_profiles on delete cascade,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (material_id, intern_id)
);
create index if not exists learning_assignments_intern_idx
  on public.learning_assignments (intern_id);

alter table public.learning_materials enable row level security;
alter table public.learning_assignments enable row level security;

drop policy if exists "team manage learning" on public.learning_materials;
create policy "team manage learning" on public.learning_materials for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

-- An intern reads a material only because it was assigned to them.
drop policy if exists "interns read assigned learning" on public.learning_materials;
create policy "interns read assigned learning" on public.learning_materials for select
  using (exists (select 1 from public.learning_assignments a
                 join public.intern_profiles i on i.id = a.intern_id
                 where a.material_id = learning_materials.id
                   and i.user_id = (select auth.uid())));

drop policy if exists "team manage assignments" on public.learning_assignments;
create policy "team manage assignments" on public.learning_assignments for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "interns read own assignments" on public.learning_assignments;
create policy "interns read own assignments" on public.learning_assignments for select
  using (exists (select 1 from public.intern_profiles i
                 where i.id = learning_assignments.intern_id
                   and i.user_id = (select auth.uid())));

-- Marking your own reading done is the one write an intern has here.
drop policy if exists "interns complete own assignments" on public.learning_assignments;
create policy "interns complete own assignments" on public.learning_assignments for update
  using (exists (select 1 from public.intern_profiles i
                 where i.id = learning_assignments.intern_id
                   and i.user_id = (select auth.uid())))
  with check (exists (select 1 from public.intern_profiles i
                 where i.id = learning_assignments.intern_id
                   and i.user_id = (select auth.uid())));

-- -------------------------------------------------------------- documents
-- Section 11.4 item 6: "own ID and bank upload". This is the most sensitive
-- table in the product, so it is the narrowest: the owner, and an
-- administrator. Deliberately not is_org_staff -- a member is not payroll,
-- and section 6.2 gives nobody but the founder another person's HR file.
create table if not exists public.person_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('identity','bank','address','agreement','other')),
  label text not null,
  bucket text not null default 'crm-files',
  path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  unique (bucket, path)
);
create index if not exists person_documents_user_idx on public.person_documents (user_id);

alter table public.person_documents enable row level security;

drop policy if exists "own documents" on public.person_documents;
create policy "own documents" on public.person_documents for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "admins read documents" on public.person_documents;
create policy "admins read documents" on public.person_documents for select
  using (public.is_org_admin(organization_id));

comment on table public.person_documents is
  'Identity and bank documents somebody uploads about themselves. Readable by that person and by an administrator, and by nobody else -- a member of staff is not payroll.';
comment on table public.learning_assignments is
  'Which material an intern was given. An intern reads a material because a row here points at them, never because the material exists.';
comment on column public.tasks.project_id is
  'The project a task belongs to. Sales tasks hang off a customer or a lead; work tasks hang off a project, and that is what the intern and staff task lists read.';
