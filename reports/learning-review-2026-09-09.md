# MUCO LABS — Learning & Courses repair report

Reviewed and implemented locally on 9 September 2026. Scope: public Learning page, learning portal entry, Way2Me course discovery/enquiry destinations, founder image, related navigation and responsive layout. This pass does not certify the entire CRM or deploy production changes.

## Result

The main website now has `/learning` for course discovery and `/learning-portal` for learner access. Course enquiries go directly to `https://way2me.in/contact/`. Learning sign-in and registration continue to Way2Me's existing website. The new portal page is an entry page, not a second LMS, shared login system or locally hosted classroom.

The Learning page lists **65 Way2Me course titles**: 64 poster listings in the public academics catalogue plus Advanced Engineering Design Techniques in the public LMS directory. All **8 MUCO service lines** appear separately and link to their existing service pages. No fees, open-batch claims, placement promises or course schedules were invented.

The supplied `yogahari.png` replaces the earlier downloaded portrait. The source and published asset have matching SHA-256 hashes; the supplied image was copied without visual alteration. Its full aspect ratio, meaningful alt text and dimensions are preserved.

The tutor profile now identifies **Srinivash Mahalingam · Founder at MUCO Labs · Tutor at Way2Me** and uses the same founder portrait shown on the About page. A separate leadership card identifies **Yogahari Haran · Founder & CEO, Way2Me**. The supplied `Form Responses 1` sheet contains 27 visible responses, averaging **4.7/5**; the public page shows edited themes only and never publishes student names, email addresses or phone numbers. The visible college values are SOA / ITER variants. Searches for IIT, BHU, Banaras and Varanasi returned no matching row in the supplied sheet, so feedback for the second college remains pending the correct source file.

## Findings and fixes

| Priority | Observed issue / root cause | Fix and current result |
| --- | --- | --- |
| P1 | Learning enquiry links pointed to MUCO's contact page, contrary to the requested Way2Me destination. The query value also was not a standard MUCO service choice. | All course enquiry actions now use Way2Me's contact URL. An actual browser click from the Python course reached Way2Me's contact form. No message was submitted. |
| P1 | No dedicated learning portal entry; learners could confuse the MUCO customer sign-in with course access. | Added `/learning-portal`, distinct Way2Me sign-in/registration/help actions, and plain account guidance. Actual sign-in link navigation reached Way2Me's username/password screen. |
| P2 | Only three generic learning cards existed; the requested course/service listing was absent. | Added 65 source-backed course titles, six editorial subject filters, keyword search, result count, clear/reset and an empty state. All eight services reuse the existing service data. |
| P2 | The old founder card used a different portrait and had no dedicated layout styling. | Added the supplied image and a responsive portrait/profile section with a direct navigation anchor. Browser confirmed it loads. |
| P2 | At 320 CSS pixels, header actions pushed the mobile menu beyond the viewport. | The top-row sign-in is hidden below 361px; sign-in remains accessible inside the mobile menu. Retest showed no horizontal overflow and a reachable menu. |
| P2 | Tutor profile and learner feedback were missing or assigned to the wrong person on the Learning page. | Added Srinivash Mahalingam with the exact role **Founder at MUCO Labs · Tutor at Way2Me** and the About-page portrait, kept Yogahari Haran as Way2Me Founder & CEO, and added the 27-response summary, 4.7/5 rating and five editorial feedback themes. Student identities are excluded. |
| P2 | Way2Me's academics catalogue consists of 64 images with blank alt text, so course names were absent from text extraction and could not be searched accessibly. | Transcribed the displayed titles into semantic HTML on MUCO. Source numbering has gaps; these are not assumed to be missing courses. |
| P2, external | Way2Me registration's Terms and Conditions link points to `/dashboard/`, which showed a login screen. | Recorded for the Way2Me site owner. No Way2Me source/admin access is present in this workspace, so this external issue is not marked fixed. |

## How the user journeys work

1. Learner opens MUCO → Learning → searches or filters the catalogue.
2. “Enquire at Way2Me” opens Way2Me's contact page directly. The learner enters the subject/message there; no automatic form prefill or enquiry delivery is claimed.
3. Existing learner opens Learning Portal → Sign in at Way2Me → existing Way2Me dashboard login.
4. New learner opens Learning Portal → Register at Way2Me → existing registration page.
5. Business customer uses the separate MUCO service cards and customer portal.

## Verification evidence

| Coverage | Result | Evidence / boundary |
| --- | --- | --- |
| Generation and packaging | PASS | `python build.py` and `npm run build`; both new routes, asset, footer links and sitemap entries are generated. |
| Static page validation | PASS | `python scripts/check-learning.py`: 65 courses, 8 services; 129 learning links and 51 portal links inspected for local destinations/anchors; all 67 marked enquiry actions across the two pages target Way2Me. External URL server status is not implied by this static check. |
| Script syntax | PASS | `node --check` for `main.js` and `analytics.js`; Python modules compile. |
| API regression | PASS | Existing lead/event suites: 31 checks passed. No new live lead or email sent. |
| Customer authentication | PASS in code / CONFIGURATION PENDING | Login and customer signup now call Supabase Google OAuth and preserve the callback destination. `portal/test-google-auth.mjs` passes. Supabase Google provider and Google Cloud redirect settings still need to be enabled before production sign-in can work. |
| Search | PASS, Chromium | Whitespace and uppercase `PYTHON` returns Full Stack Development and Python Programming; unmatched Tamil plus markup text produces the empty state without HTML injection. |
| Filter and reset | PASS, Chromium | Python plus AI/data gives zero results; clear restores all 65 and returns keyboard focus to search. Tab from search reaches the subject selector. |
| Desktop/mobile UI | PASS for checked states | Desktop screenshot, 390px and 320px Learning checks, 768px Learning check; portal checked at 320px and 768px. No horizontal overflow after header fix. Founder image rendered with original proportions. |
| Destinations | PASS for public landing screens | Actual course enquiry click reached Way2Me contact; actual portal sign-in click reached Way2Me login. Registration page was read and shows expected fields. |
| Accessibility | PARTIAL | Semantic titles/headings, labels, keyboard path, visible focus, live result count and image alt text checked. No screen reader or full WCAG conformance test. |
| No-JavaScript resilience | SOURCE VERIFIED | All courses, services and links are generated HTML; filter controls start hidden until JS initializes. Browser JS-disabled mode was not exercised. |
| Console | PASS for observed local session | No error entries reported for the final local preview session. |
| Delivery / authentication | PENDING | No production deploy, Way2Me login submission, enrolment, payment, or contact form delivery test. External pages can change or become unavailable. |

## Sources and maintenance

- [Way2Me academics catalogue](https://way2me.in/academics/): 64 posters visually read in the live browser.
- [Way2Me online course directory](https://way2me.in/courses/): one additional public course.
- [Advanced Engineering Design Techniques](https://way2me.in/courses/advanced-engineering-design-techniques/): linked from the live course directory.
- [Way2Me dashboard](https://way2me.in/dashboard/), [registration](https://way2me.in/registration/), and [contact](https://way2me.in/contact/): current public destination screens inspected.
- Founder portrait: supplied directly by the user in this task.

Edit titles/categories in `learning_catalog.py`, the page content in `learning_pages.py`, and regenerate using `python build.py`. This is a dated catalogue snapshot, not automatic synchronization. Reconcile both Way2Me catalogues before future content releases. Update the displayed check date when re-verifying listings. Keep current fees, batches and enrolment decisions on Way2Me unless an authoritative feed becomes available.

## Release boundary

The reviewed public Learning assets are now live: `/learning`, `/learning-portal` and `/assets/yogahari.png` each returned HTTP 200 after the main branch push. The separate `portal.mucolabs.com` deployment still serves the previous Magic Link UI, so the Google sign-in/sign-up code is committed but not yet live there. The portal host needs its own deployment trigger; Supabase Google provider configuration is also still required for an actual OAuth session.

The new Learning pages require no database migration, but earlier CRM/auth/storage changes have their own migration and live verification requirements. Rollback uses the prior public-site deployment; Way2Me data and accounts are unaffected by these public-page changes.
