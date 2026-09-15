# Growth implementation — R&D, loop 1

Date: 14 September 2026. Scope: the public marketing website at https://mucolabs.com and its enquiry/measurement endpoints. Existing workspace application changes belong to another workstream and are preserved.

## Executive thesis

Apply the supplied growth brief to increase qualified enquiries. First place worldwide for all service searches is not an achievable acceptance criterion: search results depend on intent, location, competition and search-engine decisions. Prioritise Erode commercial intent, useful service pages and an accessible remote-delivery proposition. No fabricated clients, results, prices, reviews or city offices.

## Users and first success

A business owner needs a website that helps customers enquire, or software that reduces manual work. The first success is direct contact or a confirmed stored enquiry, without a customer account. Existing customers retain their separate sign-in link.

## Evidence and baseline

- Live /contact sends WhatsApp, phone and email links to client workspace login. Source build.py also rewrites direct contact links to login.
- content.py contains both an anonymous lead form and contradictory account-required copy on the same contact page. The form requests unnecessary initial qualification fields.
- api/lead.js exists despite generated README text saying it was removed. Success must require durable storage; email-only delivery must be distinguished from a CRM record.
- analytics.js watches the obsolete enquiry-form ID; main.js uses lead-form and does not report successful submission. Campaign context is read only on the submitting page.
- Service schema URLs point at service-index fragments rather than individual service pages. Organisation schema gives the city's centre coordinates as if they were the business location.
- The repository already provides static HTML, eight service pages, an Erode website page, sitemap, canonical URLs, genuine screenshot/recording assets, written-scope pricing, and rate-limited intake. Improve these foundations.
- One beauty-brand project is marked paid client work without supporting payment/permission evidence in this task. Ask the founder; until confirmed use an active-build label.

## Search evidence

Search results sampled on this date include TechnoMagics, Jovosys and Praneesh Infotech. Their own sites lead with recognisable services/location, consultation links and service-specific information. This is a qualitative sample, not a measured Google rank or backlink audit. Do not copy their claims, text or design.

Google's official AI-features guidance says ordinary SEO remains applicable, no special AI file/schema is required, and inclusion is not guaranteed: https://developers.google.com/search/docs/appearance/ai-features . Its helpful-content guidance prioritises useful, reliable content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content .

## Domain and business rules

Enquiry: contact name, phone, business, service requirement; optional email, website, budget, timeline and detail. Audit enquiry also requires website URL. Consent is required for contact. A pending or failed request retains entered details. Only durable CRM receipt counts as a recorded lead. Direct channel clicks are intent signals, not completed conversations. Do not send outreach or test notification emails to anyone without explicit authorisation.

## Page and intent map

| Intent | Owning page | Change |
|---|---|---|
| Business website plus local enquiry setup | Home; new business-website-growth | Clear front-door offer, scope and exclusions |
| Website development in Erode | Existing website-development-erode | Preserve URL; link useful commercial resources |
| Software/app/SEO/automation services | Existing eight services-* pages | Clear Erode base, remote delivery, contextual public CTA |
| Textile order and job-work software | New textile-software | Specific operational workflow, staged scope, no invented deployments |
| Website cost in Erode | New website-cost-erode | Answer-first scope comparison, recurring costs, no invented prices |
| Free website audit | Existing website-audit | Short public form; audit context stored with enquiry |
| Contact/quote | Existing contact | One public form and direct channels |

## Responsibilities and unknowns

Design preserves the dark premium visual identity and adds restrained mobile contact actions. Engineering fixes generated sources, validation, attribution, conversion events, schema and regressions. Marketing supplies a local-profile checklist, audit template and 30/60/90-day actions. Search Console, Bing, GA reports, Google Business Profile ownership, paid-client evidence and production deployment credentials must be verified where available; do not claim access or metrics without evidence. Prices remain custom quoted. Do not invent international offices, backlinks, bookings or standalone AI-impression reporting.

## Handoff

Design must specify forms and all delivery states before implementation. Testing must cover 320, 360, 390, 412, tablet and desktop widths, direct channel URLs, campaign navigation, successful/failed/duplicate submissions, indexable source, sitemap and schema. Report production and local evidence separately.
