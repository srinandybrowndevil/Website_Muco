-- One person, one role, per organization.
-- Applied to production 10 September 2026.
--
-- Found by the roles verification checklist, row 0.3. Nothing stopped the same
-- person holding two rows in memberships for the same organization -- client
-- and admin, or intern and member. Every permission check in this database
-- asks "does a row exist with this role", so two rows meant two answers, both
-- true, and the person quietly held the union of both roles. Worse, the code
-- that picks a primary membership takes the first row it is handed, and
-- PostgreSQL promises no order -- so which workspace someone landed in could
-- change between two page loads with nothing having changed underneath.
--
-- Nobody had a duplicate when this was applied, which is why it had never
-- surfaced. That is the argument for the constraint, not against it: the rule
-- was being honoured by habit rather than enforced.
--
-- Changing somebody's role is now an update to the row they have, which is
-- what it always should have been. An insert that would add a second role
-- fails with 23505 rather than quietly granting both.
alter table public.memberships
  add constraint memberships_one_role_per_person unique (organization_id, user_id);

comment on constraint memberships_one_role_per_person on public.memberships is
  'A person holds exactly one role in an organization. Change a role by updating this row, never by adding a second one.';
