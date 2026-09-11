-- Eight SECURITY DEFINER functions were callable by the anon role.
--
-- None of them is exploitable: every one begins by reading auth.uid() or a
-- membership, and for an unauthenticated caller that is null, so each already
-- refuses. But "already refuses" is a property of the body, and the body is a
-- thing somebody edits. Taking the grant away makes the refusal a property of
-- the grant instead, which is the version that survives a later edit.
--
-- Four functions deliberately keep their anon grant, and it is worth writing
-- down which and why, so a future sweep does not "fix" them:
--
--   ingest_website_enquiry    the public contact form writes through it
--   ingest_analytics_event    the public site writes through it
--   verify_certificate        an employer checking a serial has no account
--   get_invitation            the accept page reads it before signing anybody in

revoke execute on function public.accept_invitation(text) from anon;
revoke execute on function public.convert_request(uuid) from anon;
revoke execute on function public.convert_website_enquiry(uuid) from anon;
revoke execute on function public.get_website_analytics_summary(integer) from anon;
revoke execute on function public.is_org_admin(uuid) from anon;
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.is_org_staff(uuid) from anon;

-- complete_customer_onboarding belonged to the self-service sign-up flow, and
-- that flow no longer exists: the four workspaces are invitation-only, and
-- accept_invitation does this job with an invitation behind it. Left in place
-- rather than dropped, because dropping a function is harder to undo than
-- revoking one and the founder may yet want sign-up back -- but it answers
-- nobody until then.
revoke execute on function public.complete_customer_onboarding(text, text, text, text, text) from anon;
revoke execute on function public.complete_customer_onboarding(text, text, text, text, text) from authenticated;
