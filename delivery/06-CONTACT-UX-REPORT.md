# Station 6 — Contact / Global Public Website UX Fix Report

**Product:** mucolabs.com public website only
**Date:** 15 September 2026
**Scope:** Contact page, free website review page, shared header/form components, global public-site QA.

## 1. Root causes found and fixes

| Issue | Actual root cause | Component/file | Fix |
|---|---|---|---|
| Lead form appeared disabled / flat | `<fieldset class="lead-fields" disabled>` in the HTML meant every control started disabled until `main.js` re-enabled it. | `contact.html`, `website-audit.html` | Removed the `disabled` attribute from the fieldset. `main.js` still guards submission with a `pending` flag. |
| Form errors and status messages not visible | `.form-error` and `.form-status` were `display: none` by default and `main.js` only injected text, never toggled the `.show` class. | `style.css` | Added `:not(:empty)` display rules for `.public-lead-form .form-error` and `.public-lead-form .form-status` so text injected by `main.js` appears immediately. |
| Honeypot visible to screen layout | `.lead-honeypot` used `display: none`; while hidden, it is not the robust off-screen pattern requested and could still be flagged. | `style.css` | Replaced with an absolute, 1×1, clipped, off-screen wrapper containing `aria-hidden="true"`, `tabindex="-1"` and `autocomplete="off"` on the input. |
| Optional details looked like native browser summary | `<details class="lead-optional">` had no marker reset, hover or focus styling. | `style.css` | Styled the summary as a flex row with a custom chevron, `list-style: none`, hover colour and `focus-visible` ring. |
| Header had two identical accent CTAs | `.nav-actions .btn-accent` used the same accent fill as `.btn-primary`, creating visual competition. | `style.css` | `.nav-actions .btn-accent` is now transparent with an accent border and accent text, leaving `Start a Project` as the dominant action. |
| Consent row lacked polish | The checkbox label had raw whitespace, the link text was lower-case, and spacing was basic. | `contact.html`, `website-audit.html`, `style.css` | Tightened the label markup and added `cursor: pointer`, `accent-color`, and `Privacy Policy` link styling. |
| No reusable header-height token | Header clearance relied on `--nav-h` directly; the design system had no public `--header-height` alias. | `style.css` | Added `--header-height: var(--nav-h)`, used it for `scroll-padding-top`, `header nav` height and `.public-lead-form` scroll margin. |
| Submit button class was not primary | The submit button used `.btn-accent`. | `contact.html`, `website-audit.html` | Changed submit buttons to `.btn-primary btn-lg`. |

## 2. Files modified

- `contact.html`
- `website-audit.html`
- `style.css`
- `delivery/00-MASTER-REPORT.md` (referenced)
- `delivery/05-TEST-REPORT.md` (referenced)

## 3. Files removed

No source files were removed. Temporary Playwright inspection scripts were deleted after use.

## 4. Old auth / portal references

A targeted search for `client.mucolabs.com`, `portal.mucolabs.com`, `/login` and `/signup` found no remaining public links. Occurrences of words such as "customer portals", "dashboards", "client portal" appear only as service descriptions (what MUCO LABS builds for clients) and were intentionally retained.

## 5. Contact flow after fix

PUBLIC VISITOR
→ `contact.html` or `website-audit.html`
→ scroll to `#lead-form` / hero CTA
→ complete fields and consent
→ `main.js` validates client-side
→ `POST /api/lead`
→ `api/lead.js` validates server-side, checks honeypot, rate-limits, sanitises
→ Resend email to the configured MUCO LABS recipient
→ success / error status shown in the page

No login, signup, database or portal redirect is involved.

## 6. Form email flow

`main.js` collects the form data (including the off-screen honeypot and consent) and sends JSON to `/api/lead`. `api/lead.js` rejects non-POST requests, checks the honeypot, enforces per-IP rate limiting, validates required and optional fields, truncates oversize values, strips control characters and sends the notification via Resend. The endpoint returns safe JSON that `main.js` renders into the `aria-live` status region.

## 7. Responsive viewports tested

Playwright was used at:

- 320 × 700
- 390 × 844
- 768 × 1024
- 1280 × 800

No `h1` / header overlap and no horizontal page scroll were found on any public route. The only elements extending past the viewport are the intentionally off-screen honeypot wrappers.

## 8. Accessibility checks

- Every input has an explicit `<label>`.
- Required fields are marked and announced with `aria-describedby` pointing to error/help slots.
- `aria-invalid="true"` is set on invalid fields.
- The status region uses `role="status"` and `aria-live="polite"`.
- The honeypot is `aria-hidden="true"`, `tabindex="-1"`, and off-screen.
- The consent checkbox is wrapped in a clickable `<label>`.
- `focus-visible` rings are provided for the details summary.

## 9. Build / lint / typecheck

| Check | Command | Result |
|---|---|---|
| Static build | `node scripts/build-site.mjs` | Passed — 38 files packaged. |
| Lead API contract | `node --test test-lead.mjs test-event.mjs` | 20 passed, 0 failed; 3 passed, 0 failed. |

No TypeScript / lint pipeline exists for the static root site.

## 10. Browser / Playwright results

- 0 `h1` / header overlaps across 27 pages and four viewports.
- 0 browser console errors during the audit.
- 0 horizontal page overflow caused by layout elements.
- Empty-form submission on `/contact` correctly displayed field-level errors and the summary status message.
- Header CTA hierarchy verified: `Start a Project` is accent-filled; `Free Consultation` is transparent with an accent border.

## 11. Remaining issues

- Lighthouse / Core Web Vitals were not measured in this session.
- Real-device and cross-browser testing were not measured in this session.
- Resend email delivery was not tested end-to-end; it requires a valid `RESEND_API_KEY` and verified sender domain in production.
- Screenshot comparison tooling was not available for a before/after image pair.

## 12. Screenshot comparison

No automated screenshot diff was generated. The Playwright measurements above provide the before/after numerical evidence.
