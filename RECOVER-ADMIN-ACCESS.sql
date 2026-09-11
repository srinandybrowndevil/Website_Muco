-- MUCO LABS -- how to get back into /admin after the accounts were cleared.
--
-- Every account was deleted on 11 September 2026 at the founder's instruction.
-- Signing up again creates a client account, not an administrator: the new-user
-- trigger writes a profile and nothing else, and onboarding attaches a customer.
-- There is deliberately no self-serve path to admin, which is correct security
-- and is also why this file exists.
--
-- HOW TO USE IT
--   1. Go to https://admin.mucolabs.com/signup and create an account with the
--      email you want to be the founder. Confirm the email.
--   2. Open the Supabase SQL Editor:
--      https://supabase.com/dashboard/project/iruolxedptsuhjlyagon/sql/new
--   3. Put your email on the line below where it says PUT_YOUR_EMAIL_HERE.
--   4. Run it. Sign out and back in, and /admin will open.
--
-- Keep this file. It is the only way back in without hand-writing SQL.

begin;

with me as (
  select id from auth.users
  where email = lower(btrim('founder@gmail.com'))
),
org as (
  -- The existing workspace. If it was removed too, the insert below makes one.
  select id from public.organizations order by created_at limit 1
),
made as (
  insert into public.organizations (name, slug)
  select 'MUCO LABS', 'muco-labs'
  where not exists (select 1 from org)
  returning id
),
target as (
  select coalesce((select id from org), (select id from made)) as org_id
)
insert into public.memberships (organization_id, user_id, role)
select target.org_id, me.id, 'admin'
from target, me
on conflict (organization_id, user_id) do update set role = 'admin', disabled_at = null;

-- Prove it worked before committing. If this returns no row, the email did not
-- match an account -- check it was confirmed, then try again.
select u.email, m.role::text as role, o.name as workspace
from public.memberships m
join auth.users u on u.id = m.user_id
join public.organizations o on o.id = m.organization_id
where m.role = 'admin';

commit;
