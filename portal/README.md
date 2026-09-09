# MUCO CRM

A CRM for MUCO Labs, built with Next.js 16 App Router, TypeScript, and Supabase. Configured workspaces use saved records, realtime updates and a 30-second recovery refresh. Without Supabase public values, the labelled demo remains available. Configured accounts never fall back to sample business data after a database error.

Complete installation instructions in Tamil: [Supabase + Vercel guide](../DEPLOYMENT_GUIDE_TA.md).

Live modules include leads, customers, follow-ups, projects, proposal/invoice tracking, workspace totals, private file sharing, invitation link creation and a new-lead follow-up rule. Proposals/invoices are tracking records, not an email delivery or tax-invoice engine. Request attachment selections still store metadata only; shared deliverables use the Files module.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Leave both Supabase values unset for demo mode.

## Authentication URLs

- `/login` — password and magic-link sign in for team members
- `/signup` — customer-only account creation (email confirmation required)
- `/complete-profile` — finish customer onboarding after email confirmation
- `/forgot-password` — request password recovery
- `/reset-password` — set a password from a recovery session
- `/verify-email` — verification guidance and resend
- `/accept-invite?token=...` — validate and accept an invitation
- `/auth/callback` — Supabase PKCE/magic-link/recovery/callback
- `/auth/error` — sanitized authentication errors

## Customer portal

- `/signup` — create a customer account with email verification
- `/complete-profile` — bind the new account to the `muco-labs` organization via `complete_customer_onboarding`
- `/portal/requests` — view your submitted project requests
- `/portal/requests/new` — submit a new project request

## Team inbox

- `/requests` — admin/member inbox for all customer project requests
- `/requests/[id]` — request details, status updates and conversion to lead/project
- `/enquiries` — website enquiry inbox with status management
- `/enquiries/[id]` — enquiry detail view
- `/analytics` — first-party website analytics dashboard

Set Supabase **Site URL** to the deployed app origin. Add these exact redirect URL patterns for each environment:

```text
http://localhost:3000/auth/callback
https://YOUR_PRODUCTION_HOST/auth/callback
```

The app supplies safe internal destinations in the callback query string. Do not configure wildcard external callback destinations.

## Connect Supabase

1. Create a Supabase project.
2. Apply migrations in filename order:

```bash
supabase/migrations/20261012000000_crm_schema.sql
supabase/migrations/20261013000000_auth_invitations.sql
supabase/migrations/20261014000000_customer_requests.sql
supabase/migrations/20261015000000_website_monitoring.sql
supabase/migrations/20261016000000_security_fixes.sql
supabase/migrations/20261017000000_live_workspace.sql
supabase/migrations/20261018000000_analytics_retention.sql
supabase/migrations/20261019000000_website_enquiry_conversion.sql
supabase/migrations/20261020000000_customer_request_files.sql
supabase/migrations/20261021000000_profile_avatars.sql
supabase/migrations/20261022000000_source_code_and_roles.sql
supabase/migrations/20261023000000_security_lockdown.sql
supabase/migrations/20261024000000_hot_path_indexes.sql
supabase/migrations/20261025000000_clients_never_see_source.sql
supabase/migrations/20261026000000_intern_workspace.sql
```

3. Set only the public project values (and optionally the public app origin).
Never add a service-role key to a public variable or commit one:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Create the first administrator in the Supabase Auth dashboard (public team signup remains disabled; customer accounts are created through `/signup`).
5. In SQL, create the MUCO LABS organization (the slug must be `muco-labs` for customer self-onboarding) and insert the Auth user into `public.memberships` with role `admin`. The base migration’s auth trigger creates the matching profile automatically. Example, replacing all values:

```sql
insert into public.organizations (id, name, slug)
values ('ORGANIZATION_UUID', 'MUCO LABS', 'muco-labs');

insert into public.memberships (organization_id, user_id, role)
values ('ORGANIZATION_UUID', 'AUTH_USER_UUID', 'admin');
```

Admins create invitations through `public.create_invitation(...)`. It returns the raw token once; deliver it as `/accept-invite?token=RETURNED_TOKEN`. Only a SHA-256 digest is stored. Invite role, organization, email, expiry, and optional client identity are fixed by the administrator.

Invited users who do not yet have an account can use `/accept-invite` to request a secure one-time sign-in link. The page masks invitation details, asks for the exact invited email, and sends a Supabase OTP/magic link with `shouldCreateUser` enabled only in this invitation context. The link redirects through `/auth/callback` back to the same tokenized `/accept-invite` path, where the authenticated user can accept. The `accept_invitation` RPC remains the final authority: it requires an authenticated matching-email user, enforces expiry, and consumes the invitation transactionally. Users who already have an account can sign in directly and then accept the invitation.

## Security model

`src/proxy.ts` refreshes cookies and performs optimistic route checks. Role hints may be read from JWT `app_metadata` when configured, but proxy is not the authorization boundary. Every data operation must remain protected by database RLS and server-side authorization. Never put a service-role key in browser code or a `NEXT_PUBLIC_` variable.

The nullable clients in `src/lib/supabase` deliberately return `null` without public configuration so all routes remain honestly usable in demo mode. Demo changes are fixtures and do not persist.

## Quality and deployment

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Deploy to a Next.js-compatible Node host, apply every migration in filename order, configure matching callback URLs and custom SMTP, and use HTTPS in production. Existing databases must only receive missing migrations. Run `npm run check:setup` for a read-only API check and the staging access checks in `supabase/tests/access_checks.sql` before opening customer access.
