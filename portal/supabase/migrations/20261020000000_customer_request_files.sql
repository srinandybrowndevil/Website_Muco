-- Store real customer request uploads as private CRM files.
begin;

alter table public.files
  add column if not exists request_id uuid references public.project_requests(id) on delete cascade;

create index if not exists files_request_idx on public.files(request_id);

create policy "customers attach own request files"
  on public.files
  for insert to authenticated
  with check (
    request_id is not null
    and exists (
      select 1
      from public.project_requests r
      join public.customers c on c.id = r.customer_id
      where r.id = files.request_id
        and r.organization_id = files.organization_id
        and c.id = files.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy "customers remove own request uploads"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'crm-files'
    and exists (
      select 1 from public.customers c
      where c.organization_id::text = (storage.foldername(name))[1]
        and c.id::text = (storage.foldername(name))[2]
        and c.auth_user_id = auth.uid()
    )
  );

create policy "customers upload request files"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'crm-files'
    and exists (
      select 1 from public.customers c
      where c.organization_id::text = (storage.foldername(name))[1]
        and c.id::text = (storage.foldername(name))[2]
        and c.auth_user_id = auth.uid()
    )
  );

-- Roll back a just-created request when its file metadata transaction fails.
-- Storage objects are removed by the client after this RPC returns.
create or replace function public.delete_customer_request_after_file_failure(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required'; end if;
  delete from public.project_requests r
  using public.customers c
  where r.id = p_request_id
    and r.customer_id = c.id
    and c.auth_user_id = v_user
    and r.status = 'new'
    and r.converted_at is null;
end $$;

revoke all on function public.delete_customer_request_after_file_failure(uuid) from public;
grant execute on function public.delete_customer_request_after_file_failure(uuid) to authenticated;

commit;
