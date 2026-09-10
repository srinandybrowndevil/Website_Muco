-- Serial numbers are the founder's to set, as originally asked.
-- Applied to production 10 September 2026.
--
-- The form already makes the field read-only for anyone who is not an admin,
-- and that is worth having, but a read-only input is a courtesy rather than a
-- rule: the same change goes through with one direct API call. The staff
-- policy on these tables is ALL, so a team member could renumber an invoice
-- without ever touching the interface.
--
-- Row-level security cannot express "this column, this role", so the rule goes
-- in a trigger. Everything else about a proposal or an invoice stays editable
-- by staff -- only the serial is held back.
create or replace function public.guard_document_serial() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.number is distinct from old.number
     and not public.is_org_admin(old.organization_id) then
    raise exception 'Only an administrator can change a document number.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

revoke all on function public.guard_document_serial() from public, anon, authenticated;

create trigger proposals_serial_is_admin_only
  before update on public.proposals
  for each row execute function public.guard_document_serial();

create trigger invoices_serial_is_admin_only
  before update on public.invoices
  for each row execute function public.guard_document_serial();

comment on function public.guard_document_serial() is
  'Refuses a change to a document number unless the caller administers the organization. The read-only field in the form is the courtesy; this is the rule.';

-- Verified after applying, with the probe invoice removed afterwards: the
-- founder can renumber, a non-admin is refused by the trigger, and every other
-- field on the same row still saves. The refusal was tested as the table owner
-- so row-level security was out of the way -- otherwise it would have proved
-- only that the policy blocked the row, not that the trigger works.
