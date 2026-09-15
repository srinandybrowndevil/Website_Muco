-- Customer profile details that belong to the person, not the customer record.
--
-- These values are editable by the account owner through the client workspace.
-- They are deliberately kept on profiles so a person who belongs to more than
-- one MUCO customer record has one consistent identity everywhere.
begin;

alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists instagram_url text;

alter table public.profiles
  drop constraint if exists profiles_linkedin_url_length,
  add constraint profiles_linkedin_url_length
    check (linkedin_url is null or char_length(linkedin_url) <= 300),
  drop constraint if exists profiles_instagram_url_length,
  add constraint profiles_instagram_url_length
    check (instagram_url is null or char_length(instagram_url) <= 300);

comment on column public.profiles.linkedin_url is
  'Optional public LinkedIn profile URL supplied by the account owner.';
comment on column public.profiles.instagram_url is
  'Optional public Instagram profile URL supplied by the account owner.';

-- The existing "users update own profile" policy remains the authority. These
-- columns must never become a staff-managed back door to somebody else's data.
comment on table public.profiles is
  'Personal identity details. Owners may update their own row; staff directory reads follow the existing workspace policy.';

-- The onboarding RPC was originally used by the self-service customer flow.
-- Re-enable it for authenticated users now that customer sign-up is a real
-- front door again. The function still creates only a client membership and
-- verifies the email before doing so.
grant execute on function public.complete_customer_onboarding(text, text, text, text, text)
  to authenticated;

commit;
