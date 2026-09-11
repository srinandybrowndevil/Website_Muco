-- Switching somebody off, everywhere, at once.
-- Applied to production 10 September 2026.
--
-- Found by the roles verification checklist, rows 1.10, 6.6 and 11.6. There
-- was no way to do this. staff_profiles.status can pause an employee record,
-- but that is a field on one table about one kind of person -- an account kept
-- every permission its membership carried regardless. A laptop lost on a
-- Friday could not be shut out before Monday, and the only remedy was to
-- delete the membership outright, which loses the history of who did what.
--
-- The rule belongs in the four predicates every policy in this database
-- already calls. One change there disables a person across every table and
-- every workspace at once, with no policy left to remember and none to get
-- wrong later. Putting the check on each page instead would have been the
-- "hide the button" fix the checklist warns against -- the interface would
-- have gone quiet while the API kept answering.
alter table public.memberships
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_reason text;

-- Almost every check asks only about people who are still active, so the index
-- covers that case rather than the whole table.
create index if not exists memberships_active_idx
  on public.memberships (user_id) where disabled_at is null;

create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships
                where organization_id=org and user_id=auth.uid() and disabled_at is null)
$$;

create or replace function public.is_org_staff(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships
                where organization_id=org and user_id=auth.uid() and disabled_at is null
                  and role = any(array['admin','member']::public.app_role[]))
$$;

create or replace function public.is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships
                where organization_id=org and user_id=auth.uid() and disabled_at is null
                  and role='admin')
$$;

create or replace function public.is_any_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships
                where user_id=auth.uid() and disabled_at is null and role='admin')
$$;

-- An intern's dated window is a second gate, and it has to close too. Without
-- this a disabled intern still passes the date check and keeps the workspace.
create or replace function public.intern_access(p_user uuid)
returns table (state text, ends_at date, days_left integer)
language sql stable security definer set search_path='' as $$
  select
    case
      when m.disabled_at is not null then 'closed'
      when current_date < i.starts_at then 'not_started'
      when current_date <= i.ends_at then 'active'
      when current_date <= i.ends_at + i.grace_days then 'grace'
      else 'closed'
    end,
    i.ends_at,
    greatest(0, i.ends_at - current_date)::integer
  from public.intern_profiles i
  join public.memberships m on m.user_id = i.user_id and m.organization_id = i.organization_id
  where i.user_id = p_user
$$;

insert into public.audit_actions(action, description) values
  ('membership.disabled', 'Somebody''s access was switched off'),
  ('membership.restored', 'Somebody''s access was switched back on')
on conflict (action) do nothing;

comment on column public.memberships.disabled_at is
  'Set to cut this person off everywhere at once. Read by is_org_member, is_org_staff, is_org_admin, is_any_admin and intern_access, so every policy in the database honours it without being edited.';

-- Verified after applying, inside a transaction that was rolled back: the
-- founder -- the strongest account there is -- was disabled and every
-- predicate went false together, with the customer list dropping from 5 rows
-- to 0 when read through the policies as that person. The count matters more
-- than the booleans: it proves the data stopped arriving, not merely that a
-- function returned false.
