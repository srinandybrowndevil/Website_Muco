# Station 3 — Frontend Handoff (Loop 3)

**Date:** 15 September 2026

## Delivered

- All root `*.html` files — `Sign in` portal links replaced with `Start a Project` buttons linking to `/contact`.
- `learning.html` — removed learning portal entry; hero secondary CTA now links to `/contact`; bottom callout points to `/contact`.
- `contact.html` — removed customer workspace sign-in link; project updates now point to email.
- `work.html` — updated status description to reflect server-side lead capture and email delivery.
- `terms.html`, `privacy.html`, `refund.html` — fixed broken `sign in to your account` text to `message us on WhatsApp`.
- `sitemap.xml` — removed `/learning-portal` entry.
- `analytics.js` — removed `signup_click` event tracking.
- `scripts/build-site.mjs` — clears `public-site/` before copying to avoid stale files.

## Integration contract

- All header and footer links must resolve to routes in `public-site/`.
- The `lead-form` posts JSON to `/api/lead` and expects `{ok, recorded, emailed}` on success or `{errors}` on validation failure.
- `analytics.js` still calls `/api/event` but the response is ignored by design.

## Verification

- `node scripts/build-site.mjs` packages 38 files into `public-site/`.
- `grep` over `public-site/*.html` finds no `client.mucolabs.com`, `/login`, `/signup` or `/learning-portal` links.
