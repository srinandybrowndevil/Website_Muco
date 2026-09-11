-- Section 11.4 item 6 asks an employee to upload their own identity and bank
-- documents. They cannot: every storage policy on the files bucket is written
-- for admin and member, so an employee has no insert path and an intern has
-- none either. The table added in 20261109 would have had nowhere to point.
--
-- A person gets their own folder and nothing wider. The path is
--   <organization_id>/people/<user_id>/<file>
-- so the third path segment is the owner, and the policies below compare it
-- to auth.uid() rather than trusting the page that built the path.

drop policy if exists "people upload their own documents" on storage.objects;
create policy "people upload their own documents" on storage.objects for insert to authenticated
with check (
  bucket_id = 'crm-files'
  and (storage.foldername(name))[2] = 'people'
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and exists (select 1 from public.memberships m
              where m.organization_id::text = (storage.foldername(name))[1]
                and m.user_id = (select auth.uid())
                and m.disabled_at is null)
);

drop policy if exists "people read their own documents" on storage.objects;
create policy "people read their own documents" on storage.objects for select to authenticated
using (
  bucket_id = 'crm-files'
  and (storage.foldername(name))[2] = 'people'
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

-- Taking your own document back down. An administrator can already remove
-- anything in the bucket through the existing staff policy.
drop policy if exists "people remove their own documents" on storage.objects;
create policy "people remove their own documents" on storage.objects for delete to authenticated
using (
  bucket_id = 'crm-files'
  and (storage.foldername(name))[2] = 'people'
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

-- Note on what is deliberately absent: there is no policy letting an
-- administrator read another person's folder through storage. They read the
-- row in person_documents, which records that a document exists, and can
-- reach the object through the existing staff download policy on the bucket.
-- That keeps one path for studio access rather than two that could drift.
