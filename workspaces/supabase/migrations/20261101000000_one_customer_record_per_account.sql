-- QA audit, loop 1, finding F-12. Applied to production 10 September 2026.
--
-- One account, one customer record.
--
-- complete_customer_onboarding() already looks for an existing customer before
-- creating one, and the sign-up page looks too. Both are check-then-insert, and
-- neither holds a lock between the check and the insert, so two requests
-- arriving together -- a double-tapped button, a retry after a timeout -- could
-- both find nothing and both create a record. The page also discarded the error
-- from its own check, so a transient failure there read as "no customer yet"
-- and went on to onboard again.
--
-- A constraint cannot be raced. The application checks stay, because they give
-- a better message than a constraint violation does, but the guarantee now
-- rests here rather than on them.
--
-- NULL is allowed more than once by design: a customer record created by the
-- founder for someone who has not signed up yet has no account attached, and
-- there may be many of those.
--
-- Checked before applying: zero accounts held more than one customer record.
alter table public.customers
  add constraint customers_one_record_per_account unique (auth_user_id);

comment on constraint customers_one_record_per_account on public.customers is
  'One customer record per signed-in account. NULL is unconstrained: those are records created before the person has an account.';
