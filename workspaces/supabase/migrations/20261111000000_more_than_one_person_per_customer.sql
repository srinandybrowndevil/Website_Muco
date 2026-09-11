-- More than one person per customer.
--
-- Section 11.5 of the specification asks for a People page in the client
-- workspace where "the client owner" invites "their manager or viewer". The
-- schema could not express that. Client access ran entirely through
-- customers.auth_user_id — one column, one person — and every client-facing
-- policy reduced to "this customer's auth_user_id is you". accept_invitation
-- made it explicit: a second person accepting an invitation to the same
-- customer got "customer unavailable", because the update it performs requires
-- the column to be null or already theirs.
--
-- So this is a real gap rather than a missing screen, and filling it means
-- moving the relationship out of a column and into a table. The shape:
--
--   customer_members(customer_id, user_id, level)   owner | manager | viewer
--
-- customers.auth_user_id stays, still names the first person to accept, and is
-- backfilled into this table as the owner. Nothing that reads it breaks; it
-- simply stops being the only answer to "may this account see this customer".
--
-- Three levels rather than two, because "owner" carries a power the others do
-- not: inviting other people. A manager is somebody who works on the project
-- day to day; a viewer is somebody who was asked to look at it. Neither can
-- add a third person, which keeps the blast radius of a shared password to one
-- organisation rather than to an invitation chain.

create type public.customer_access as enum ('owner', 'manager', 'viewer');

create table if not exists public.customer_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level public.customer_access not null default 'viewer',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (customer_id, user_id)
);

create index if not exists customer_members_user_idx on public.customer_members(user_id);
create index if not exists customer_members_org_idx on public.customer_members(organization_id);

comment on table public.customer_members is
  'Who may open a customer''s workspace, and at what level. Replaces customers.auth_user_id as the authority for that question; auth_user_id still records the first person to accept.';

-- Everybody who already had access keeps it, as the owner of their customer.
-- This runs before the policies below start reading the table, so there is no
-- moment at which a live client cannot see their own project.
insert into public.customer_members(organization_id, customer_id, user_id, level)
select organization_id, id, auth_user_id, 'owner'
from public.customers
where auth_user_id is not null
on conflict (customer_id, user_id) do nothing;

alter table public.customer_members enable row level security;

-- ----------------------------------------------------------------- helpers
-- SECURITY DEFINER because the policies below call them while reading the very
-- table they query. Without that the first policy evaluation recurses into
-- itself and Postgres refuses the whole statement.
--
-- Both honour the disable switch by joining memberships. A person switched off
-- is not a member of anything, and putting that here rather than in five
-- policies means no policy written later can forget it.
create or replace function public.is_customer_member(p_customer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.customer_members m
    join public.memberships mm
      on mm.user_id = m.user_id and mm.organization_id = m.organization_id
    where m.customer_id = p_customer
      and m.user_id = (select auth.uid())
      and mm.disabled_at is null
  )
$$;

create or replace function public.customer_level(p_customer uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.level::text
  from public.customer_members m
  join public.memberships mm
    on mm.user_id = m.user_id and mm.organization_id = m.organization_id
  where m.customer_id = p_customer
    and m.user_id = (select auth.uid())
    and mm.disabled_at is null
  limit 1
$$;

revoke all on function public.is_customer_member(uuid) from public, anon;
revoke all on function public.customer_level(uuid) from public, anon;
grant execute on function public.is_customer_member(uuid) to authenticated;
grant execute on function public.customer_level(uuid) to authenticated;

-- ---------------------------------------------------------------- policies
drop policy if exists "members read their own customer row" on public.customer_members;
create policy "members read their own customer row" on public.customer_members
for select to authenticated
using (public.is_customer_member(customer_id) or public.is_org_staff(organization_id));

-- Writes go through the functions below or through the studio. Letting an
-- owner insert directly would let them choose their own level, and the level
-- is the thing that decides who may invite.
drop policy if exists "staff manage customer members" on public.customer_members;
create policy "staff manage customer members" on public.customer_members
for all to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));

-- ------------------------------------------- the five client-facing policies
-- Each one changes from "this customer's auth_user_id is you" to "you are a
-- member of this customer". The backfill above makes those the same set today,
-- so nothing a live client can currently see changes; what changes is that the
-- set can now have more than one person in it.
drop policy if exists "clients view own customer" on public.customers;
create policy "clients view own customer" on public.customers
for select to authenticated
using (public.is_customer_member(id));

drop policy if exists "clients view projects" on public.projects;
create policy "clients view projects" on public.projects
for select to authenticated
using (public.is_customer_member(customer_id));

drop policy if exists "clients view invoices" on public.invoices;
create policy "clients view invoices" on public.invoices
for select to authenticated
using (public.is_customer_member(customer_id));

-- kind = 'document' stays, and stays first. It is the condition that keeps
-- working files, source and internal notes attached to the same project out of
-- a client's reach entirely, and it is older and more important than the
-- change being made here.
drop policy if exists "clients view files" on public.files;
create policy "clients view files" on public.files
for select to authenticated
using (kind = 'document' and public.is_customer_member(customer_id));

drop policy if exists "clients read own milestones" on public.project_milestones;
create policy "clients read own milestones" on public.project_milestones
for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_milestones.project_id
    and public.is_customer_member(p.customer_id)
));
