# Local workspace preview — Research

The founder has requested credential-free local development across the public website and the customer, administrator, employee and intern workspaces. No commit, push or deployment is authorized in this iteration.

The current proxy and server account guard both depend on Supabase, the external authentication and database service. Removing only the sign-in fields would leave internal pages inaccessible. The four applications also require related project, person, task and document records to render meaningful screens.

Implement an explicit development-only preview flag. Authentication and database access will use an isolated local sample store while this flag is active. Existing production integrations remain dormant and recoverable; remote accounts, database contents and deployment configuration are outside this change. The preview must remain disabled in production even if its flag is set. Public local links must stay on local workspace addresses.

Acceptance: one click enters each workspace; all internal pages render; local edits survive refresh and are visible across workspaces; no Supabase or authentication requests leave the browser; credential recovery routes do not display password fields; mobile navigation remains usable. Preview data and limitations are labelled throughout. Public production SEO and canonical URLs remain unchanged.

## Review loop 2

The first rendered customer overview exposed a missing primary heading and a shared `.bar` class collision. The customer and employee header wrappers inherited progress-bar height, clipping and child-span styles. These are existing authenticated-layout defects that were hidden by the previous login-only review. Correct the semantic heading and give header rows their own class before accepting mobile QA. Local Turbopack also failed restoring its cache; the local launcher now uses the supported webpack development mode.
