-- Convert a qualified website enquiry to one CRM lead exactly once.
-- The enquiry remains the source record; the linked lead is the sales record.
begin;

alter table public.website_enquiries
  add column if not exists converted_at timestamptz,
  add column if not exists converted_lead_id uuid references public.leads(id) on delete set null;

create index if not exists website_enquiries_converted_lead_idx
  on public.website_enquiries(converted_lead_id)
  where converted_lead_id is not null;

create or replace function public.convert_website_enquiry(p_enquiry_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_enquiry public.website_enquiries%rowtype;
  v_actor uuid := auth.uid();
  v_role text;
  v_lead_id uuid;
begin
  if v_actor is null then raise exception 'authentication required'; end if;

  select * into v_enquiry
  from public.website_enquiries
  where id = p_enquiry_id
  for update;
  if not found then raise exception 'enquiry not found'; end if;

  select role::text into v_role
  from public.memberships
  where organization_id = v_enquiry.organization_id and user_id = v_actor;
  if v_role <> 'admin' then raise exception 'admin required'; end if;

  if v_enquiry.converted_lead_id is not null then
    return jsonb_build_object('lead_id', v_enquiry.converted_lead_id, 'already_converted', true);
  end if;

  insert into public.leads(
    organization_id, owner_id, name, company, email, source, stage, estimated_value
  ) values (
    v_enquiry.organization_id,
    v_actor,
    v_enquiry.name,
    coalesce(nullif(v_enquiry.business, ''), v_enquiry.name),
    v_enquiry.email,
    left('website enquiry' || case when v_enquiry.channel is not null then ' · ' || v_enquiry.channel else '' end, 80),
    'new',
    0
  ) returning id into v_lead_id;

  update public.website_enquiries
  set status = 'converted', converted_at = now(), converted_lead_id = v_lead_id
  where id = p_enquiry_id;

  insert into public.activities(
    organization_id, actor_id, entity_type, entity_id, action, payload
  ) values (
    v_enquiry.organization_id, v_actor, 'website_enquiry', p_enquiry_id,
    'converted', jsonb_build_object('lead_id', v_lead_id)
  );

  return jsonb_build_object('lead_id', v_lead_id, 'already_converted', false);
end $$;

revoke all on function public.convert_website_enquiry(uuid) from public;
grant execute on function public.convert_website_enquiry(uuid) to authenticated;

commit;
