-- Profile photos move out of the profiles table.
--
-- avatar_url held a base64 data URI: a 256x256 JPEG inlined as roughly 20-35 KB
-- of text, re-read from Postgres by the customer shell on every page load, for
-- a query that otherwise returns a name. Storage serves the same image once and
-- lets the browser cache it, and the column goes back to holding a short URL.
--
-- The bucket is public on purpose. An avatar is shown to anyone who can see the
-- person's name in the workspace, it carries no private content, and a public
-- object needs no signed URL round trip before it can render. Writes stay
-- locked down: only the owner may write their own folder.

begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict(id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object keys are "<user id>/<file>", so the first path segment is the owner.
-- A signed-in user may only write inside their own folder; nobody can overwrite
-- someone else's photo by guessing a key.
drop policy if exists "avatar owner insert" on storage.objects;
create policy "avatar owner insert" on storage.objects for insert to authenticated
with check(bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update" on storage.objects for update to authenticated
using(bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check(bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete" on storage.objects for delete to authenticated
using(bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Reads are public for this bucket only; the bucket carries nothing private.
drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects for select to public
using(bucket_id = 'avatars');

-- Any data URI already saved is dropped rather than migrated. There is no way
-- to move it server-side, it is the thing this migration exists to stop
-- storing, and the owner can re-upload in a few seconds.
update public.profiles set avatar_url = null where avatar_url like 'data:%';

-- Bumped so a deploy that expects storage-backed avatars refuses to run against
-- a database that has not been migrated. Keep in step with requireWorkspace.
create or replace function public.crm_schema_version() returns integer
language sql stable set search_path='' as $$ select 9 $$;

commit;
