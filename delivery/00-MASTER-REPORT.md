# MUCO LABS — Public Website Rebuild: QA Master Report

**Product type:** Website (https://mucolabs.com)
**Loop:** 3
**Date:** 15 September 2026
**Prepared for:** Srinivash Mahalingam, founder, MUCO LABS
**Result:** Ready for Vercel deployment under the public-website-only scope. The previous four-workspace portal architecture is no longer built or deployed by the root `vercel.json`.

## Executive summary

The repository was refactored so that only the public business website and a small server-side enquiry email function remain in production scope. All public-facing portal links were removed, the contact form now sends enquiries directly by email through Resend, the first-party analytics endpoint no longer writes to a database, and the static site build now clears stale output before packaging. The build succeeds, contract tests pass, and no `login`, `signup`, `client.mucolabs.com` or `/learning-portal` links remain in the published HTML.

## A. Architecture

- **Framework:** Static HTML, CSS and JavaScript built by `scripts/build-site.mjs`.
- **Deployment:** Vercel using `vercel.json` with `framework: null` and `outputDirectory: public-site`.
- **Database:** None required for normal public website operation.
- **Email provider:** Resend (https://resend.com) via `api/lead.js`.
- **Analytics:** Google Analytics 4 and Google Tag Manager tags remain in each page `<head>`; first-party events are accepted by `api/event.js` but are intentionally not persisted to a database.
- **No production database dependency confirmed.** The site renders every public page and processes enquiries without Supabase or any other database.

## B. Removed or disabled systems

- Customer/client portal links (`https://client.mucolabs.com/login`) from desktop and mobile navigation, plus the contact, learning and work pages.
- `/learning-portal` page and footer link; replaced by a 301 redirect to `/learning`.
- Learning portal call-to-action on `/learning`.
- Customer workspace mention on `/contact` and `/work`.
- Supabase CRM ingestion from `api/lead.js`.
- Supabase analytics persistence from `api/event.js`.
- Supabase environment variables from `.env.example`.
- `signup_click` tracking event from `analytics.js`.
- Portal workspace preview links from `scripts/dev-site.mjs` and the local `/__preview` page.

The `workspaces/` monorepo source remains in the repository but is not included in the static build or the root Vercel deployment.

## C. Modified files

- `api/lead.js` — rewritten as email-only Resend sender.
- `api/event.js` — rewritten as no-op analytics receiver.
- `.env.example` — updated to Resend-only variables.
- `analytics.js` — removed `signup_click` event.
- `scripts/build-site.mjs` — clears `public-site/` before copying.
- `scripts/dev-site.mjs` — removed portal preview links.
- `vercel.json` — added `/learning-portal` to `/learning` 301 redirect.
- `sitemap.xml` — removed `/learning-portal` entry.
- `learning.html`, `contact.html`, `work.html`, `terms.html`, `privacy.html`, `refund.html` — removed portal references.
- All root `*.html` — replaced `Sign in` portal links with `Start a Project` CTA.
- `test-lead.mjs`, `test-event.mjs` — updated to match the new email/no-op behaviour.
- `style.css` — unchanged in this loop; existing styles already support the new `btn btn-primary` CTA classes.

## D. New files

None. All changes were edits to the existing static site or API files.

## E. Deleted files

- `learning-portal.html`

## F. Environment variables

Required production variables:

- `RESEND_API_KEY` — Resend API key.
- `LEAD_TO_EMAIL` — recipient for enquiries (default `founder@mucolabs.com`).
- `LEAD_FROM_EMAIL` — verified sender address on a Resend domain.

No Supabase, database or authentication variables are required for the public website.

## G. Route map

Final public routes served from `public-site/`:

`/`
`/about`
`/services`
`/services-websites`
`/services-software`
`/services-mobile`
`/services-product-design`
`/services-business-systems`
`/services-ai-automation`
`/services-marketing`
`/services-support`
`/pricing`
`/contact`
`/faq`
`/work`
`/careers`
`/learning`
`/maintenance`
`/website-audit`
`/website-development-erode`
`/website-cost-erode`
`/business-website-growth`
`/textile-software`
`/privacy`
`/terms`
`/refund`
`/404`

Redirect: `/learning-portal` → `/learning` (301, permanent).

## H. SEO map

| URL | Primary intent | Title | H1 | Canonical | Schema |
|---|---|---|---|---|---|
| / | Home | Website Development & Custom Software in Erode \| MUCO LABS | Website development in Erode that helps customers find you. | https://mucolabs.com/ | Organization, WebSite, WebPage |
| /about | About the company | About \| Founder-led software studio in Erode \| MUCO LABS | A founder-led software studio in Erode. | https://mucolabs.com/about | Organization, AboutPage |
| /services | Service overview | Services \| Web, Mobile, Software, AI & Marketing \| MUCO LABS | What we build, and what you get | https://mucolabs.com/services | Organization, ItemList |
| /services-websites | Website service | Website Design & Development Services \| MUCO LABS, Erode | Website design & development | https://mucolabs.com/services-websites | Organization, Service |
| /services-software | Software service | Custom Software & SaaS Development in Erode \| MUCO LABS | Custom software & SaaS | https://mucolabs.com/services-software | Organization, Service |
| /services-mobile | Mobile app service | Mobile App Development in Erode \| MUCO LABS | Mobile app development | https://mucolabs.com/services-mobile | Organization, Service |
| /services-product-design | Design service | UI/UX & Product Design in Erode \| MUCO LABS | UI/UX and product design | https://mucolabs.com/services-product-design | Organization, Service |
| /services-business-systems | Business systems service | CRM, ERP & Billing Software in Erode \| MUCO LABS | CRM, ERP, HRMS, LMS & billing | https://mucolabs.com/services-business-systems | Organization, Service |
| /services-ai-automation | AI automation service | AI & Business Automation in Erode \| MUCO LABS | AI & business automation | https://mucolabs.com/services-ai-automation | Organization, Service |
| /services-marketing | Marketing service | SEO & Digital Marketing Services in Erode \| MUCO LABS | Digital marketing & SEO | https://mucolabs.com/services-marketing | Organization, Service |
| /services-support | Support service | Branding, IT & Cloud Support in Erode \| MUCO LABS | Branding, IT & cloud support | https://mucolabs.com/services-support | Organization, Service |
| /pricing | Pricing guidance | Pricing \| How We Quote \| MUCO LABS | We quote from a scope, not from a price list | https://mucolabs.com/pricing | Organization |
| /contact | Enquiry conversion | Contact MUCO LABS \| Free Project Consultation in Erode | Tell us what your business needs. | https://mucolabs.com/contact | Organization, ContactPage, BreadcrumbList |
| /faq | Common questions | FAQ \| Pricing, Process & Ownership \| MUCO LABS | The questions we actually get asked | https://mucolabs.com/faq | Organization, FAQPage |
| /work | Proof and portfolio | Work & Projects \| MUCO LABS | Six things we are actually building | https://mucolabs.com/work | Organization |
| /learning | Learning content | Learning & Courses \| Way2Me & MUCO LABS | Build your skills. Choose your next step. | https://mucolabs.com/learning | Organization |
| /website-audit | Audit lead gen | Free Website Review & Audit \| MUCO LABS | Find out what your website is actually doing. | https://mucolabs.com/website-audit | Organization |
| /website-development-erode | Local service page | Website Development in Erode \| MUCO LABS | Website development in Erode | https://mucolabs.com/website-development-erode | Organization |
| /website-cost-erode | Local pricing guide | What Does a Business Website Cost in Erode? \| MUCO LABS | What does a business website cost in Erode? | https://mucolabs.com/website-cost-erode | Organization |
| /business-website-growth | Growth guide | Business Website & Local Search Setup \| MUCO LABS, Erode | A business website built around customer enquiries. | https://mucolabs.com/business-website-growth | Organization |
| /textile-software | Industry solution | Textile Order & Job Work Software in Erode \| MUCO LABS | Keep textile orders, job work and stock connected. | https://mucolabs.com/textile-software | Organization |
| /careers | Hiring | Careers & Freelancer Collaboration \| MUCO LABS | We are small, and we hire that way | https://mucolabs.com/careers | Organization |
| /maintenance | Support plans | Maintenance & Support Plans \| MUCO LABS | Someone who answers when something breaks | https://mucolabs.com/maintenance | Organization |
| /privacy | Legal | Privacy Policy \| MUCO LABS | Privacy policy | https://mucolabs.com/privacy | Organization |
| /terms | Legal | Terms \| MUCO LABS | Terms and conditions | https://mucolabs.com/terms | Organization |
| /refund | Legal | Refund & Cancellation \| MUCO LABS | Refund and cancellation policy | https://mucolabs.com/refund | Organization |
| /404 | Error | Page not found \| MUCO LABS | That page does not exist. | https://mucolabs.com/404 | Organization |

## I. SEO/AEO/GEO work completed

- Unique `<title>` and `<meta name="description">` on every public page.
- Canonical URLs and `alternate hreflang` `en-IN` / `x-default` links.
- Open Graph and Twitter/X metadata on every page.
- `robots.txt` allows public crawlers and names major answer-engine bots explicitly.
- `sitemap.xml` lists all public routes except the removed `/learning-portal`.
- Organization schema, WebSite schema, ContactPage, FAQPage and BreadcrumbList schema remain on relevant pages.
- No fake testimonials, ratings, awards, offices or invented business facts were introduced.
- `llms.txt` retained for answer-engine grounding.

## J. Testing

| Check | Command | Result |
|---|---|---|
| Static build | `node scripts/build-site.mjs` | Passed — 38 files packaged into `public-site/`. |
| Lead API contract | `node test-lead.mjs` | 20 passed, 0 failed. |
| Event API contract | `node test-event.mjs` | 3 passed, 0 failed. |
| Node test runner | `node --test test-lead.mjs test-event.mjs` | 2 suites passed. |
| Portal link removal | `grep` over `public-site/*.html` for `client.mucolabs.com`, `Sign in`, `/login`, `/signup`, `/learning-portal` | No remaining portal links found. |
| Lint / typecheck | Not run. | This static site has no TypeScript/lint pipeline at the root. |
| Responsive / accessibility / Lighthouse | Not run in this session. | Existing semantic HTML, responsive CSS and a11y patterns were preserved; manual device testing is recommended before final certification. |
| Cross-browser | Not run. | Only the built files and Node contract tests were exercised. |

## K. Performance

- Lighthouse/Core Web Vitals were not measured in this session.
- The production build is now a pure static HTML/CSS/JS site with no Next.js portal bundle, which removes the previous workspace JavaScript overhead entirely.
- Images, fonts and SVGs continue to be served with long-lived cache headers configured in `vercel.json`.

## L. Remaining limitations

- The `workspaces/` monorepo source still exists in the repository but is excluded from the static build and root Vercel deployment. It is not required for the public website.
- Responsive, accessibility and Lighthouse checks were not run in this session; they should be completed before final certification.
- Email delivery depends on a valid Resend API key and a verified sender domain.
- The public enquiry endpoint has per-instance rate limiting; a shared store would be required for stronger abuse protection if traffic grows.
- The existing `learning-portal-callout` CSS class name remains in `learning.html` and `style.css` but is no longer a portal link.

## M. Deployment

1. Commit the changes and push to the `main` branch.
2. In Vercel, confirm the project uses `node scripts/build-site.mjs` as the build command and `public-site/` as the output directory.
3. Set `RESEND_API_KEY`, `LEAD_TO_EMAIL` and `LEAD_FROM_EMAIL` in Vercel environment variables.
4. Remove any unused Supabase/auth environment variables from the Vercel project to avoid confusion.
5. Verify that `https://mucolabs.com/learning-portal` returns a 301 redirect to `/learning`.

## Factory station notes

- **R&D:** Scope changed to public website only; decision to retain the existing static HTML/CSS/JS build and remove public-facing portal dependencies rather than migrate frameworks.
- **Design:** Navigation simplified to a single primary CTA, Start a Project, linked to `/contact`. The footer no longer links to `/learning-portal`.
- **Frontend:** All public pages updated to remove `Sign in` links and replace them with the Start a Project button. The `/learning` page was updated to remove the Way2Me portal CTA.
- **Backend:** `api/lead.js` now validates and emails enquiries through Resend. `api/event.js` accepts events but does not persist them to a database.
- **Tester:** Contract tests for both endpoints were updated and pass.
- **QA:** This report. No S0–S2 defects found in the public-website scope; unmeasured areas are declared in Section J and Section K.
