# Growth implementation — Frontend handoff

Implemented from the R&D brief and design specification. build.py retains existing portal constants for customer-workspace compatibility but marketing actions use CONSULTATION_URL, WHATSAPP_URL and CALL_URL. Its generated marketing output no longer applies the contact-gating rewrite. Existing URLs and premium styles remain.

## Implemented UI

One short public form on /contact, a dedicated audit form on /website-audit, direct contact links and a responsive bottom contact bar. Homepage prioritises websites and enquiries with a problem-to-service map. Eight service pages retain their URLs, receive local titles and carry service context into the form. Three new generated pages: /business-website-growth, /textile-software, /website-cost-erode. Organisation and Service metadata are corrected; sitemap includes new pages.

## API contract

POST /api/lead receives bounded name, phone, business and service; optional email, website, budget, timeline, message; consent; company_website honeypot; form_type project/audit; submission_id UUID; page, landing_page, referrer origin, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id.

Expected responses: 200 confirmed CRM receipt; 202 explicit email-only delivery; 400 field errors; 403 cross-origin; 413 body limit; 429 retry; 503 delivery unconfirmed. Client ignores duplicate submissions while pending, retains data after failure, and reuses an identifier for retries. Success must not be inferred from HTTP 200 alone. Only recorded:true triggers a lead conversion. No automatic email or WhatsApp message is sent by the browser.

## Measurement

attribution.js captures first landing path, external referrer origin and six bounded UTM values in sessionStorage. This survives internal navigation without copying contact fields. analytics.js uses the existing CRM event allowlist plus metadata for detailed actions; GA4 receives form-start, confirmed project/audit submissions and generate_lead. Clicks remain intent signals. Automatic gtag page_view is disabled so the explicit page view can omit query strings. GTM container configuration must be reviewed separately for duplicate tags/enhanced measurement.

## Backend work required next

Enforce validation and audit URL checks server-side; use shared durable idempotency/rate limiting and store extended attribution. Preserve the existing admin enquiry inbox and avoid creating customer accounts. Use timeouts and safe operational logs. Tests must stub external CRM/email systems unless explicit permission exists for a live test notification. Production storage and analytics dashboard receipt remain unverified until access permits evidence.
