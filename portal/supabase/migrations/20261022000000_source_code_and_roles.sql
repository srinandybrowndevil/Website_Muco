-- Source-code deliverables, repository links, and the intern/employee roles.
--
-- Three founder requests that cannot be done in the front end alone:
--   1. Upload a project's source archive (.zip / .rar) from the admin panel.
--   2. Record the GitHub repository beside the project.
--   3. Introduce 'intern' and 'employee' as first-class roles.
--
-- The four-workspace specification is a larger programme; this migration only
-- adds what those three need, so nothing here presumes the final shape of the
-- intern or employee portals.

begin;

-- 1. Source archives -------------------------------------------------------
-- crm-files rejects archives today because the bucket's allowed_mime_types
-- list was written for documents and images. Browsers disagree about archive
-- MIME types (.zip arrives as application/zip, x-zip-compressed or
-- octet-stream; .rar as vnd.rar, x-rar-compressed or octet-stream), so every
-- spelling is listed. The extension is enforced in the client, and the size
-- ceiling is raised because source archives are not 10 MB documents.
update storage.buckets
set file_size_limit = 209715200,  -- 200 MB
    allowed_mime_types = allowed_mime_types || array[
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.rar',
      'application/x-rar-compressed',
      'application/octet-stream'
    ]
where id = 'crm-files';

-- Marks a file row as a source-code deliverable rather than a shared document,
-- so the client file list and the admin source list are not the same query.
alter table public.files
  add column if not exists kind text not null default 'document'
    check (kind in ('document', 'source_archive'));

comment on column public.files.kind is
  'document = shared with the customer; source_archive = project source, admin upload only.';

-- 2. Repository link -------------------------------------------------------
alter table public.projects
  add column if not exists repo_url text
    check (repo_url is null or repo_url ~ '^https://(www\.)?github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/?$');

comment on column public.projects.repo_url is
  'Canonical GitHub repository for the project. Constrained to github.com so a
   pasted token URL or a private gist cannot be stored here by accident.';

-- 3. Roles -----------------------------------------------------------------
-- Postgres cannot add an enum value inside a transaction that then uses it, and
-- cannot remove one at all, so the new roles are added here and any policy that
-- should recognise them is updated in a later migration once the workspaces
-- exist. Adding the values now is safe: nothing grants them yet, and every
-- existing policy tests for specific roles rather than "not client".
alter type public.app_role add value if not exists 'intern';
alter type public.app_role add value if not exists 'employee';

commit;

-- Reminder for whoever applies this: existing policies check
-- role in ('admin','member'), so an 'intern' or 'employee' membership currently
-- has no staff access anywhere. That is deliberate. Access for those roles
-- lands with the workspaces that use them, not before.
