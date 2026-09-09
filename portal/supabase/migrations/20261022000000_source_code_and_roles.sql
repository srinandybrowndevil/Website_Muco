-- Source-code deliverables, repository links, and the intern/employee roles.
-- Applied to production on 9 September 2026 as two migrations:
--   source_archives_and_repo_url, add_intern_and_employee_roles
-- The enum change is separate because Postgres will not let a value be added
-- and used inside one transaction.

-- Browsers disagree about archive MIME types (.zip arrives as application/zip,
-- x-zip-compressed or octet-stream; .rar as vnd.rar, x-rar-compressed or
-- octet-stream), so every spelling is listed. The extension is enforced in the
-- client. The ceiling is raised because source archives are not 10 MB documents.
update storage.buckets
set file_size_limit = 209715200,
    allowed_mime_types = (
      select array_agg(distinct m) from unnest(
        allowed_mime_types || array[
          'application/zip',
          'application/x-zip-compressed',
          'application/vnd.rar',
          'application/x-rar-compressed',
          'application/octet-stream'
        ]
      ) as m
    )
where id = 'crm-files';

-- Separates a source archive from a document shared with the customer, so the
-- client file list and the admin source list are not the same query.
alter table public.files
  add column if not exists kind text not null default 'document';
alter table public.files drop constraint if exists files_kind_check;
alter table public.files
  add constraint files_kind_check check (kind in ('document', 'source_archive'));
comment on column public.files.kind is
  'document = shared with the customer; source_archive = project source, admin upload only.';

-- Canonical GitHub repository for a project. Constrained to github.com so a
-- pasted token URL or a private gist cannot be stored here by accident.
alter table public.projects
  add column if not exists repo_url text;
alter table public.projects drop constraint if exists projects_repo_url_check;
alter table public.projects
  add constraint projects_repo_url_check check (
    repo_url is null or repo_url ~ '^https://(www\.)?github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/?$'
  );
comment on column public.projects.repo_url is
  'Canonical GitHub repository for the project.';

-- Run separately: Postgres cannot add an enum value and use it in one
-- transaction. Nothing grants these yet -- every existing policy tests for
-- role in ('admin','member'), so a membership with either role has no staff
-- access anywhere. Access lands with the workspaces that use them.
alter type public.app_role add value if not exists 'intern';
alter type public.app_role add value if not exists 'employee';
