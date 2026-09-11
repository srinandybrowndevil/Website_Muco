-- Indexes on the foreign keys that sit in a request path, not all 21 the
-- database linter lists. An index costs write time and storage, so the ones
-- here are the columns actually filtered on every page load or inside a policy
-- that runs on every client query. Applied to production 9 September 2026.

-- Read twice per request today: the proxy resolving the role, then the page
-- guard. It had no index at all.
create index if not exists memberships_user_idx on public.memberships (user_id);

-- The join every "clients view own ..." policy makes, so it is evaluated for
-- each row a client reads.
create index if not exists customers_auth_user_idx on public.customers (auth_user_id);

-- The customer-scoped document lists a client opens on their dashboard.
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists proposals_customer_idx on public.proposals (customer_id);
create index if not exists projects_customer_idx on public.projects (customer_id);
create index if not exists files_org_idx on public.files (organization_id);

-- Deliberately not indexed: owner_id, actor_id, uploader_id, lead_id and the
-- converted_* columns. Nothing filters on them yet, and an unused index is a
-- write cost with no read benefit. Revisit when a query needs one.

-- Also deliberately not done yet: the linter's auth_rls_initplan warning asks
-- for auth.uid() to be wrapped as (select auth.uid()) in fourteen policies so
-- it is evaluated once rather than per row. That is a genuine optimisation, but
-- rewriting fourteen policy expressions on tables holding customer and billing
-- data risks changing who can read what, and at two customers the gain is not
-- measurable. Worth doing deliberately when row counts justify the review.
