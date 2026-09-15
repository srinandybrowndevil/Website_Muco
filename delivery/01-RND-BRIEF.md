# Station 1 — R&D Brief (Loop 3)

**Product:** MUCO LABS public website only
**Date:** 15 September 2026
**Owner:** MUCO LABS engineering

## Problem statement

The repository contained a public marketing website and a four-workspace portal/auth system. The new scope is a premium, fast, trustworthy public business website where a visitor can understand services, see proof, discover the company through traditional and AI-assisted search, and submit a project enquiry without creating an account. All portal, authentication and database features are out of production scope.

## R&D decisions

1. Keep the existing static HTML/CSS/JS build pipeline because it is already Vercel-ready and requires no runtime database.
2. Remove every public-facing portal link from the static pages.
3. Replace the customer `Sign in` CTA with `Start a Project`, linking to `/contact`.
4. Convert the enquiry endpoint from Supabase CRM storage to Resend email delivery.
5. Convert the first-party analytics endpoint to a no-op so the public site never depends on a database.
6. 301-redirect `/learning-portal` to `/learning` because `/learning` is the public replacement.

## Acceptance criteria

- No public page links to `/login`, `/signup`, `client.mucolabs.com` or `/learning-portal`.
- The contact form posts to `api/lead.js` and sends an email without a database write.
- `api/event.js` accepts events but does not persist them.
- `node scripts/build-site.mjs` packages the site successfully.
- Contract tests for `api/lead.js` and `api/event.js` pass.

## Open operational dependency

Vercel environment variables for Resend must be configured by the account owner before live email delivery works. No database migration or auth setup is required.
