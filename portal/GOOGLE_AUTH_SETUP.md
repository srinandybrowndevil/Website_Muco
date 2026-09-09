# Google sign-in setup

The portal uses Supabase Auth for Google OAuth so the existing customer membership and role checks continue to work. Configure the provider before enabling this in production.

1. In Supabase Dashboard, open **Authentication → Providers → Google**, enable it, and add the Google OAuth client ID and secret.
2. In Google Cloud Console, add Supabase's provider callback as an authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase **Authentication → URL Configuration**, allow the application callbacks `https://portal.mucolabs.com/auth/callback` and `http://localhost:3000/auth/callback` for local testing.
4. Set `NEXT_PUBLIC_SITE_URL=https://portal.mucolabs.com` in the portal deployment. The app sends the requested `next` path through the callback and existing customers are routed by membership role.
5. Test both paths: an existing customer should reach their workspace; a new Google user should reach complete profile and then be provisioned as a customer.

This keeps one Supabase identity per customer. Adding a separate Firebase sign-in provider would create a second identity system and would need an explicit migration plan.
