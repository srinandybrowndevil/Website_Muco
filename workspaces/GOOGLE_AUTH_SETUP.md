# Google sign-in

The four workspaces use Supabase Auth for Google OAuth, so the membership and
role checks behind every page keep working unchanged. The provider has to be
configured before the button does anything; until then it reports itself as
unavailable and the email-and-password path still works.

The Firebase web configuration supplied for project `mucolabs-d6abf` is not
used by this flow. Its API key, app ID and Google web client ID are browser
identifiers, not a service-account credential. Do not put a Firebase Admin
private key or an OAuth client secret into the browser bundle, into a `.env`
file, or into a chat window.

## Configuring it

1. Supabase Dashboard, **Authentication → Providers → Google**: enable it and
   add the Google OAuth client ID and secret.
2. Google Cloud Console: add Supabase's own provider callback as an authorised
   redirect URI — `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase **Authentication → URL Configuration**: allow all four application
   callbacks, because each workspace is a separate origin and a callback
   landing on the wrong one would create a session in the wrong product.

   ```
   https://admin.mucolabs.com/auth/callback
   https://employee.mucolabs.com/auth/callback
   https://intern.mucolabs.com/auth/callback
   https://client.mucolabs.com/auth/callback
   http://admin.localhost:3101/auth/callback
   http://employee.localhost:3102/auth/callback
   http://intern.localhost:3103/auth/callback
   http://client.localhost:3104/auth/callback
   ```

4. Test each path that exists. Somebody who already holds a membership should
   reach their own workspace; somebody who does not should be told their
   account is not part of a workspace yet, rather than being onboarded.

## What Google sign-in does not do here

It does not create a membership. These four workspaces are invitation-only:
signing in with Google proves who somebody is and nothing more, and an account
with no membership is refused at the door with a sentence saying so. That is
the same rule the password path follows, and it is why enabling Google is safe
without also deciding who may join.

## If Firebase must be the identity provider

Stop before replacing the button. Every row-level security policy in this
database is written against Supabase `auth.uid()` and `public.memberships`; a
Firebase-only browser login does not create that session, so nothing would be
readable. A server-side token bridge, or a full identity and policy migration,
has to be designed, tested and approved first.
