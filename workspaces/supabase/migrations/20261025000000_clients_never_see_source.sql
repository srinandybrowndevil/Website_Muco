-- Clients must not see project source archives.
-- Applied to production 9 September 2026 and verified with a live RLS probe.
--
-- The client file policy matched on customer_id alone, so any row assigned to a
-- customer was visible whatever it held. With source archives now stored in the
-- same table, a project's source tagged to the customer it was built for would
-- appear in their portal -- and the storage download policy grants the object
-- to whoever has a matching files row, so they would get the archive itself,
-- not just its name.
--
-- Hiding it in the UI is not the fix. The database refuses it, so a mistake in
-- a query, a future page, or a hand-written API call cannot expose it.

drop policy if exists "clients view files" on public.files;
create policy "clients view files"
  on public.files
  for select
  using (
    kind = 'document'
    and exists (
      select 1 from public.customers c
      where c.id = files.customer_id and c.auth_user_id = auth.uid()
    )
  );

-- Same reasoning one layer down: a customer may download an object only when
-- the metadata row backing it is a document. Staff access is unchanged.
drop policy if exists "crm authorized download" on storage.objects;
create policy "crm authorized download" on storage.objects for select to authenticated
using (
  bucket_id = 'crm-files' and (
    exists (
      select 1 from public.memberships m
      where m.organization_id::text = (storage.foldername(name))[1]
        and m.user_id = auth.uid()
        and m.role in ('admin','member')
    )
    or exists (
      select 1 from public.files f
      join public.customers c on c.id = f.customer_id
      where f.bucket = storage.objects.bucket_id
        and f.path = storage.objects.name
        and f.kind = 'document'
        and c.auth_user_id = auth.uid()
    )
  )
);

-- Verification performed after applying, as the customer's own auth user:
-- inserted a source_archive row assigned to them, selected it under their JWT,
-- got zero rows, removed the probe row. Repeat with supabase/tests when the
-- policy is next changed.
