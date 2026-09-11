-- Why a user cannot be deleted in Supabase, and what to do about it.
--
-- Deleting an account in Supabase Auth cascades to public.profiles, and nine
-- foreign keys point at profiles with no delete rule at all. A reference
-- without an ON DELETE clause is NO ACTION, which refuses the delete, so the
-- dashboard reports a foreign key violation and the account stays. Every one
-- of them was written as an inline "references public.profiles" with the rule
-- simply omitted, so this was never a decision anybody made -- it is nine
-- defaults nobody noticed.
--
-- The fix is not to cascade. Cascading from a person would delete their
-- customers, their leads, their projects and their files, which is a far worse
-- outcome than not being able to delete them. What these columns actually mean
-- is "who did this" or "who owns this", and the honest answer once the person
-- is gone is nobody. So they become null, the record survives, and an unowned
-- customer shows up as unowned rather than disappearing.

-- ---------------------------------------------------- work and ownership
-- Records that outlive the person who made or owned them.
alter table public.customers drop constraint if exists customers_owner_id_fkey;
alter table public.customers add constraint customers_owner_id_fkey
  foreign key (owner_id) references public.profiles on delete set null;

-- A customer is a business, not somebody's login. Detaching the account leaves
-- the company, its invoices and its project history intact, which is what the
-- studio actually needs to keep.
alter table public.customers drop constraint if exists customers_auth_user_id_fkey;
alter table public.customers add constraint customers_auth_user_id_fkey
  foreign key (auth_user_id) references public.profiles on delete set null;

alter table public.leads drop constraint if exists leads_owner_id_fkey;
alter table public.leads add constraint leads_owner_id_fkey
  foreign key (owner_id) references public.profiles on delete set null;

-- An unassigned task is true and visible. A deleted task is a promise lost.
alter table public.tasks drop constraint if exists tasks_assignee_id_fkey;
alter table public.tasks add constraint tasks_assignee_id_fkey
  foreign key (assignee_id) references public.profiles on delete set null;

alter table public.projects drop constraint if exists projects_owner_id_fkey;
alter table public.projects add constraint projects_owner_id_fkey
  foreign key (owner_id) references public.profiles on delete set null;

alter table public.files drop constraint if exists files_uploader_id_fkey;
alter table public.files add constraint files_uploader_id_fkey
  foreign key (uploader_id) references public.profiles on delete set null;

alter table public.activities drop constraint if exists activities_actor_id_fkey;
alter table public.activities add constraint activities_actor_id_fkey
  foreign key (actor_id) references public.profiles on delete set null;

-- An invitation is a record of something that happened. Losing who sent it is
-- a smaller loss than losing that it was sent, so the column becomes nullable
-- rather than the row being deleted with its author.
alter table public.invitations alter column created_by drop not null;
alter table public.invitations drop constraint if exists invitations_created_by_fkey;
alter table public.invitations add constraint invitations_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- ------------------------------------------------------- the audit trail
-- audit_events.actor_id was already ON DELETE SET NULL, which means deleting
-- somebody has always quietly blanked the actor on every line they wrote.
-- That is worse than refusing the delete: the log keeps its rows and stops
-- being able to say who. The identity is captured at write time so the trail
-- survives the account.
alter table public.audit_events add column if not exists actor_email text;

comment on column public.audit_events.actor_email is
  'Captured when the row is written, because actor_id is set null if the account is ever deleted. Without this the log keeps every line and forgets who wrote it.';

create or replace function public.record_audit_event(
  p_action text, p_resource_type text, p_resource_id uuid default null,
  p_detail jsonb default '{}', p_organization_id uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_email text := nullif(auth.jwt() ->> 'email', '');
  v_org uuid := p_organization_id;
begin
  if v_actor is null then return; end if;
  if v_org is null then
    select organization_id into v_org from public.memberships
    where user_id = v_actor order by organization_id limit 1;
  end if;

  insert into public.audit_events(organization_id, actor_id, actor_email, action, resource_type, resource_id, detail)
  values (v_org, v_actor, v_email, p_action, p_resource_type, p_resource_id,
    coalesce((select jsonb_object_agg(key, value) from jsonb_each(p_detail)
              where key !~* '(password|secret|token|otp|aadhaar|pan|passport|bank|account_number|cvv)'), '{}'::jsonb));
end $$;

-- ------------------------------------------------------- certificates
-- This one was a deliberate ON DELETE RESTRICT, and the guarantee behind it is
-- worth keeping: no certificate has ever existed without a founder approving
-- it. But the guarantee that matters to the document is that it names its
-- approver, not that a row in another table still exists -- and the same table
-- already denormalises mentor_name for exactly that reason.
--
-- So the name is captured at issue time and required, the identifier is
-- allowed to go null, and deleting an old administrator no longer refuses.
-- The certificate keeps saying who approved it either way.
alter table public.intern_certificates add column if not exists approved_by_name text;

update public.intern_certificates c
   set approved_by_name = coalesce(
     (select p.full_name from public.profiles p where p.id = c.approved_by), 'Not recorded')
 where c.approved_by_name is null;

alter table public.intern_certificates alter column approved_by_name set not null;
alter table public.intern_certificates alter column approved_by drop not null;

alter table public.intern_certificates drop constraint if exists intern_certificates_approved_by_fkey;
alter table public.intern_certificates add constraint intern_certificates_approved_by_fkey
  foreign key (approved_by) references public.profiles on delete set null;

comment on column public.intern_certificates.approved_by_name is
  'Who approved this certificate, captured when it was issued. The document has to name its approver even if that account is later deleted; approved_by may go null, this may not.';

-- Issuing now records the approver by name as well as by id, so the guarantee
-- moved above is actually maintained on every new certificate rather than only
-- backfilled onto the old ones.
create or replace function public.issue_certificate(
  p_intern_id uuid, p_tools text[] default '{}', p_mentor_name text default null)
returns public.intern_certificates
language plpgsql security definer set search_path = '' as $$
declare
  v_intern public.intern_profiles%rowtype;
  v_serial text;
  v_name text;
  v_row public.intern_certificates%rowtype;
begin
  select * into v_intern from public.intern_profiles where id = p_intern_id;
  if not found then raise exception 'No such internship.'; end if;
  if not public.is_org_admin(v_intern.organization_id) then
    raise exception 'Only an administrator issues a certificate.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_intern.status not in ('completed','certified') and current_date <= v_intern.ends_at then
    raise exception 'This internship is still running. Mark it completed first if you are closing it early.';
  end if;

  select coalesce(full_name, 'Not recorded') into v_name
  from public.profiles where id = auth.uid();

  select 'MUCO-INT-' || to_char(current_date,'YYYY') || '-' ||
         lpad((count(*) + 1)::text, 4, '0')
    into v_serial
  from public.intern_certificates
  where organization_id = v_intern.organization_id
    and issued_on >= date_trunc('year', current_date)::date;

  insert into public.intern_certificates(organization_id, intern_id, serial, approved_by,
                                         approved_by_name, tools, mentor_name)
  values (v_intern.organization_id, v_intern.id, v_serial, auth.uid(),
          coalesce(v_name, 'Not recorded'), coalesce(p_tools,'{}'), p_mentor_name)
  on conflict (intern_id) do update
    set tools = excluded.tools, mentor_name = excluded.mentor_name
  returning * into v_row;

  update public.intern_profiles set status = 'certified' where id = v_intern.id;
  return v_row;
end $$;

revoke all on function public.issue_certificate(uuid, text[], text) from public, anon;
grant execute on function public.issue_certificate(uuid, text[], text) to authenticated;

-- After this migration, deleting a person in Supabase Auth succeeds. What
-- survives them: every customer, lead, project, task, file and invitation they
-- touched, now unowned rather than gone; every audit line they wrote, still
-- naming them by the email captured at the time; and any certificate they
-- approved, still naming them as the approver.
--
-- What does not survive: their membership, their intern or staff record, their
-- compensation and their grants. Those cascade, because each one describes the
-- relationship itself rather than work that outlives it.
--
-- Worth saying plainly: deleting is rarely the right move for somebody who
-- actually worked here. Switching them off closes every door immediately and
-- keeps the history readable. Deletion is for the test account and the
-- mistaken signup.
