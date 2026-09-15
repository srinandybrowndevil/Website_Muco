# Station 5 — Test Report (Loop 3)

**Product:** mucolabs.com public website only
**Classification:** Website
**Date:** 15 September 2026

## Purpose

Verify that the public website builds, the enquiry endpoint works without a database, the analytics endpoint is a no-op, and no portal links remain in the published HTML.

## Declared skips

- Responsive, accessibility, Lighthouse and cross-browser checks were not run in this session.
- Real Resend email delivery was not tested; the Resend API call is mocked in tests.

## Results

| Check | Command | Result |
|---|---|---|
| Static build | `node scripts/build-site.mjs` | Passed — 38 files packaged. |
| Lead API contract | `node test-lead.mjs` | 20 passed, 0 failed. |
| Event API contract | `node test-event.mjs` | 3 passed, 0 failed. |
| Node test runner | `node --test test-lead.mjs test-event.mjs` | 2 suites passed. |
| Portal link removal | `grep` over `public-site/*.html` for portal patterns | No remaining links. |

## Defects

No S0–S2 defects found in the public-website scope. Unmeasured areas are carried to QA.
