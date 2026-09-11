-- Two gaps in the storage policies, both found by wiring up a screen rather
-- than by looking for them.
--
-- The first is one this session created. Moving client access from
-- customers.auth_user_id to customer_members updated the five table policies
-- and missed storage.objects, which still asked "is this customer's
-- auth_user_id you". So a manager or viewer invited by a client owner could
-- see a document listed in public.files and be refused when they clicked it --
-- the worst shape of a permission bug, because the interface promises
-- something the storage layer then denies.
--
-- The second is older and larger. "crm staff upload" and "crm staff remove"
-- read public.memberships directly, so the disable switch added in 20261104
-- never reached them. An administrator who had been switched off could still
-- upload a file to the customer bucket and still delete one. Every table
-- policy honoured the switch; these two did not, which makes the claim
-- attached to that migration -- that switching somebody off closes every door
-- at once -- untrue of exactly these two doors.
--
-- A note on how this is written. The obvious spelling is
-- public.is_org_staff(((storage.foldername(name))[1])::uuid), which reads well
-- and has a failure mode worth avoiding: the first path segment is
-- attacker-influenced text, and casting text to uuid raises rather than
-- returning null. An object whose path does not begin with a uuid -- a stray
-- upload, an older file, a path somebody constructed by hand -- would make the
-- whole statement error instead of denying that row. A policy should refuse;
-- it should not throw. Comparing organization_id as text needs no cast and
-- cannot raise.
--
-- is_customer_member is safe to call because the uuid it receives comes from
-- the customers table, not from a path.

drop policy if exists "crm staff upload" on storage.objects;
create policy "crm staff upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'crm-files'
  and exists (
    select 1 from public.memberships m
    where m.organization_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'member')
      and m.disabled_at is null
  )
);

drop policy if exists "crm staff remove" on storage.objects;
create policy "crm staff remove" on storage.objects
for delete to authenticated
using (
  bucket_id = 'crm-files'
  and exists (
    select 1 from public.memberships m
    where m.organization_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'member')
      and m.disabled_at is null
  )
);

drop policy if exists "crm authorized download" on storage.objects;
create policy "crm authorized download" on storage.objects
for select to authenticated
using (
  bucket_id = 'crm-files'
  and (
    exists (
      select 1 from public.memberships m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'member')
        and m.disabled_at is null
    )
    -- kind = 'document' stays: working files and source attached to the same
    -- customer are not shared merely by sitting in the same bucket.
    or exists (
      select 1
      from public.files f
      join public.customers c on c.id = f.customer_id
      where f.bucket = storage.objects.bucket_id
        and f.path = storage.objects.name
        and f.kind = 'document'
        and public.is_customer_member(c.id)
    )
    -- A person's own documents, which the person-scoped policies already cover
    -- and which this must not accidentally take away.
    or ((storage.foldername(name))[2] = 'people'
        and (storage.foldername(name))[3] = (select auth.uid())::text)
  )
);

-- Proved against production inside a rolled-back transaction: a client viewer
-- who is not the owner downloads the shared document; a path that is not a
-- uuid denies rather than erroring; an active administrator reads it; a
-- switched-off administrator reads nothing and cannot upload. Five checks,
-- five expected answers, no rows left behind.
--
-- The probe also ran into keep_one_active_admin, which refused to switch off
-- the only administrator in the fixture. That was the guard working, and the
-- probe gained a second administrator rather than the guard being weakened.
