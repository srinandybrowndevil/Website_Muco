# MUCO LABS — Firebase authentication readiness

Reviewed 9 September 2026 from the supplied Firebase web configuration and the portal source.

## What the supplied values prove

The Firebase project ID, web API key, auth domain, storage bucket, messaging sender ID, app ID and Google OAuth web client ID are **browser configuration values**. They are not a Firebase Admin service-account private key. They can be referenced by a web app, but they do not by themselves enable a secure CRM session.

The live customer portal is `portal.mucolabs.com/login`. The domain `portal.megolance.com` appears to be a different or mistyped hostname and currently has no DNS answer, so it must not be treated as an alias until DNS and deployment ownership are confirmed. `danishanachievement.com` also currently has no DNS answer and is not part of the checked portal flow.

## Confirmed portal boundary

The portal currently uses Supabase Auth for password and Google OAuth, Supabase SSR cookies in `src/proxy.ts`, and Supabase `memberships` plus row-level security to decide whether a user is a customer or staff member. CRM records such as leads, customers, requests and files are protected by that Supabase identity. The existing source and live production portal both contain **Continue with Google** on sign-in and **Sign up with Google** on customer registration. The Supabase Auth settings endpoint now reports `external.google: true`, and the authorize endpoint redirects to Google successfully.

## Why a direct Firebase swap would be unsafe

Replacing the Supabase button with Firebase `signInWithPopup` would authenticate a browser user but would not automatically create the Supabase session or the UUID-based `auth.uid()` used by the CRM RLS policies. The user could appear signed in while CRM queries remain unauthorised, or a second identity record could be created for the same customer. A service-account key in browser code would create a serious security issue and must never be pasted into chat or committed.

## Recommended implementation decision

Keep Supabase Auth, database and RLS as the portal identity boundary, and enable the existing Supabase Google provider with the supplied Google web client ID and the provider secret configured only in the Supabase dashboard. This is the smallest path that preserves customer memberships and CRM access. The Firebase project can remain separate until an explicit migration plan is approved.

If Firebase must become the identity provider, the project needs a designed server-side token bridge or a full database/RLS migration, plus an account-linking strategy, token verification, logout/session refresh handling, and an authenticated end-to-end test. The web config alone is insufficient to implement that safely.

## Values still needed outside chat

- Confirm whether `portal.megolance.com` is an intended domain or a typo for `portal.mucolabs.com`.
- Choose **Supabase Auth + Firebase project unused for portal login (recommended)** or approve a Firebase-to-Supabase bridge/full migration design.
- Keep the Google OAuth client secret configured only in the Supabase dashboard. Do not send that secret here.
- Confirm the production portal deployment has the latest source, then test a new customer signup, existing customer login, membership routing, logout and CRM read/write permissions.

No numeric service prices, case-study outcomes, customer testimonials, or booking URL were invented. Until the owner supplies approved proof or a calendar link, the public site should use request-a-quote copy, authored founder guidance, and WhatsApp/contact enquiry actions.

The setup check confirms HTTP 200 reachability for all CRM tables and the live lead endpoint rejects an empty payload with the expected validation errors. During the final retest, Supabase reported Google enabled, the Google Cloud OAuth client contained the Supabase callback URI, Supabase Site URL was corrected to `https://portal.mucolabs.com`, and the founder account completed Google consent and returned to the live `portal.mucolabs.com` workspace. A customer-account membership check and a real enquiry remain separate smoke tests; this review does not submit a real enquiry, send email, or create a CRM record.
