-- Three of the seven revokes in the previous migration did nothing, and the
-- reason is worth recording because it is the shape of mistake that makes a
-- security fix look applied when it is not.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and anon is
-- a member of PUBLIC. "revoke execute ... from anon" removes a grant anon was
-- never holding directly: it succeeds, reports success, and changes nothing --
-- has_function_privilege('anon', ...) still answers true through PUBLIC.
--
-- Checking afterwards is what caught it. The revoke has to name PUBLIC, and
-- the roles that should keep it are then granted back explicitly.

revoke execute on function public.convert_website_enquiry(uuid) from public;
grant execute on function public.convert_website_enquiry(uuid) to authenticated;

revoke execute on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

revoke execute on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
