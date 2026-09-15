# Growth implementation — Design, loop 1

Input: 01-RND-BRIEF.md. Preserve existing typography, colours, layouts, image assets and motion preferences. No new visual framework or stock proof.

## Structure and components

- Shared header: primary consultation link to /contact#lead-form; existing customer Sign in remains secondary. Footer provides real tel, mailto and contextual WhatsApp links.
- Mobile: two 44px-or-larger actions, WhatsApp and Call, visible below 768px; reserve page-bottom space and respect safe areas. Hide while the navigation menu is open. No popup or form overlay.
- Home: recognisable website-development H1, Erode/Tamil Nadu base, remote delivery and secondary software/SEO services. Two hero actions: free project consultation and WhatsApp. Follow with a focused website/local-search/enquiry offer and problem-to-service links. Retain actual product evidence, explicitly labelled internal/active work.
- Services: retain eight existing URLs. Add location/service context and public consultation URLs preselecting the exact service. Related work headings must not imply shipped paid engagements.
- New business-website-growth: offer, five included scope areas, ownership, exclusions, process and FAQ. Link existing website and marketing services.
- New textile-software: order/specification, sample approval, job work, stock movements, costing, invoicing handoff and buyer communication. Explain a narrow first release and role permissions. Mark workflow examples as illustrative.
- New website-cost-erode: direct answer with scope factors and comparison of brochure, enquiry, commerce and custom systems. Explain build versus domain/hosting/support/SEO/ad costs. No unapproved prices or false delivery promises.

## Contact flow and fields

One form on /contact. Required: Your name (100 characters), Phone / WhatsApp (32; country-code helper), Business name (120; helper permits planning-stage business), What do you need? (service selector), contact-consent checkbox. Optional details are inside a details disclosure: email (160), existing website (300), budget (60), timeline (60), message (4000). Visible labels, appropriate autocomplete and persistent error slots associated using aria-describedby. Phone accepts international formats with 7–15 digits. Business and service must not be inferred from blank values.

Audit page embeds the same component with required website URL and hidden fixed service, and without budget/timeline/detail procurement questions. Contact consent and direct WhatsApp fallback remain available. Website input helper shows https://example.com. Honeypot is hidden from keyboard and assistive navigation.

## States and accessibility

- Default: concise submit label, no account requirement, privacy link and direct contact links.
- Validation: inline specific error text, aria-invalid and focus to first invalid input, opening the optional disclosure when needed.
- Sending: disabled submit, aria-busy, status text “Sending…”. Ignore repeated submit events while pending.
- Stored: “Your enquiry has been saved” or audit-specific receipt; focus live status, then offer WhatsApp. Do not claim an audit has run or promise response time.
- Email-only: show “Your enquiry was delivered by email”; do not fire the CRM recorded-lead conversion.
- Network/503/timeout: say it was not confirmed, preserve fields and submission identifier for retry; visible WhatsApp/call/email remain usable.
- Rate limit: retain fields, show retry guidance.
- No JavaScript: direct contacts and explicit form limitation remain visible; do not submit form data into a URL.
- Keyboard: visible existing focus rings, semantic links/buttons, all errors linked to fields, focusable status, reduced-motion-safe scroll. No motion on the form.
- Responsive: form rows stack on narrow screens; cards use existing responsive grids; long addresses wrap. Test 320–1920px, 200% zoom and third-party-script failure.

## Search and measurement

Every new page has one H1, a unique title/description, canonical, visible breadcrumbs and matching schema. Use Organization with city-level location instead of unverified precise coordinates. Service schema points to the actual service URL. Add first-visit landing path, referrer origin and bounded UTM fields, retained through internal navigation in sessionStorage; no query text or form content in analytics. Distinguish form start, attempt, validation error, durable lead submission, audit request, and channel intent. Existing CRM event types stay compatible, using metadata for finer classification and GA4 events for matching reporting.

## Frontend contract to implement next

POST /api/lead, same origin JSON. Fields: name, business, phone, service, optional email/website/budget/timeline/message, consent, company_website honeypot, form_type (project|audit), submission_id UUID, attribution fields (landing_page/referrer/utm_source/utm_medium/utm_campaign/utm_content/utm_term/utm_id), page. Replies: 200 {ok:true,recorded:true}; 202 {ok:true,recorded:false,emailed:true}; 400 {ok:false,errors}; 403 origin rejected; 413 oversized; 429 retry; 503 unconfirmed. No false success and no PII in operational logs.
