# Station 5 — Test Report (Loop 3)

**Product:** mucolabs.com public website only
**Classification:** Website
**Date:** 15 September 2026

## Purpose

Verify that the public website builds, the enquiry endpoint works without a database, the analytics endpoint is a no-op, no portal links remain in the published HTML, and the UI/UX alignment is clean on desktop, mobile and very narrow viewports.

## Declared skips

- Lighthouse, Core Web Vitals and cross-browser rendering were not measured in this session.
- Real Resend email delivery was not tested; the Resend API call is mocked in tests.

## Results

| Check | Command / method | Result |
|---|---|---|
| Static build | `node scripts/build-site.mjs` | Passed — 38 files packaged. |
| Lead API contract | `node test-lead.mjs` | 20 passed, 0 failed. |
| Event API contract | `node test-event.mjs` | 3 passed, 0 failed. |
| Node test runner | `node --test test-lead.mjs test-event.mjs` | 2 suites passed. |
| Portal link removal | `grep` over `public-site/*.html` for portal patterns | No remaining links. |
| Internal link integrity | Static parser over `public-site/*.html` | 0 broken internal links out of 1,698 checked. |
| Alt text | Static parser over `public-site/*.html` | 0 images missing `alt`. |
| Form labels | Static parser over `public-site/*.html` | 0 unlabelled inputs. |
| Heading hierarchy | Static parser over `public-site/*.html` | No duplicate `h1`; no skipped levels. |
| Viewport / title / description / canonical | Static parser over `public-site/*.html` | All 27 pages present. |
| Reduced-motion CSS | `style.css` search | `prefers-reduced-motion` media query present. |
| Touch-target CSS | `style.css` search | `min-width` / `min-height` ≥ 44 px rules present. |
| UI/UX alignment (Playwright) | `scripts/_ui-audit.mjs` over `http://localhost:8123` at 1280px, 390px and 360px | 0 horizontal overflow, 0 header overlaps, 0 console errors, 0 load failures across 27 pages. |
| Contact page header clearance | Playwright at 1280px, 390px, 320px | No `h1` / header overlap on `/contact` or `/website-audit`. |
| Contact form error visibility | Playwright empty-form submit on `/contact` | Field-level `.form-error` and `#lead-status` messages displayed. |
| Honeypot visibility | Playwright `getBoundingClientRect` on `/contact` and `/website-audit` | Honeypot wrapper is 1×1 and off-screen; not visible or keyboard-focusable. |
| Header CTA hierarchy | Playwright computed styles on `/contact` | `Start a Project` is accent-filled; secondary `Free Consultation` is transparent with accent border. |
| Contact form end-to-end | `node --test test-lead.mjs` | 20 passed — server validation, honeypot, rate-limit and Resend path verified. |
| Global overflow regression | Playwright across 27 pages at 320px, 390px, 768px, 1280px | No horizontal page overflow caused by layout elements. |

## Defects

No S0–S2 defects found in the public-website scope. Lighthouse and real-device testing remain as declared skips.

See `delivery/06-CONTACT-UX-REPORT.md` for the contact/global UX root-cause and fix list.
