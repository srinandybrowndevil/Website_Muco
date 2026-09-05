# MUCO LABS — mucolabs.com

Official website for MUCO LABS. Your Vision, Our Technology.

Static HTML plus one serverless function (`api/lead.js`). Deployed from `main`.

## Contact

- **Founder:** Srinivash Mahalingam
- **Website:** <https://mucolabs.com>
- **Email:** founder@mucolabs.com
- **Phone:** +91 6381809844

## How this repo works

The `.html` files in the root are **generated**. Do not hand-edit them — the next
build will overwrite your changes. Edit the source and rebuild instead:

| File | What it holds |
|---|---|
| `build.py` | Page shell, header, footer, navigation, company facts, schema helpers |
| `content.py` | All page copy, the service list, and the project portfolio data |
| `style.css` | Design system — edit directly |
| `main.js` | Browser behaviour — edit directly |
| `analytics.js` | GA4 event map — edit directly, only loaded when an ID is set |

`vercel.json`, `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest` and
the `.html` files are all generated. Edit the sources above, not the output.

```bash
python3 build.py
```

No dependencies, no npm, no build server. It writes the `.html` files plus
`robots.txt` and `sitemap.xml`, and you commit the result.

## Pages

Home · Services · Work · Pricing · About · Contact · FAQ · Maintenance ·
Careers · Privacy · Terms · Refund · 404

## Enquiry form

The contact form posts to `api/lead.js`, a Vercel serverless function. It
validates server-side, rate limits by IP, drops honeypot submissions, and
writes every accepted lead to the function log before doing anything else — so
a lead survives an email outage or a missing API key.

Set `RESEND_API_KEY` in Vercel (see `.env.example`) and it also emails the
enquiry to you. Without it nothing breaks; the leads are in
Vercel → Deployments → Functions → Logs, filtered on `[lead]`.

The browser opens WhatsApp *before* awaiting the request, because doing it
afterwards loses the click gesture and pop-up blockers eat the window.

## Turning on analytics

Open `build.py`, put the GA4 Measurement ID in `GA_MEASUREMENT_ID`, and run
`python3 build.py`.

That one line switches on three things at once: the gtag tag on every page,
the event map in `analytics.js`, and the paragraph in the privacy policy that
describes what is being collected. While the value is empty the site loads no
analytics, makes no third-party request, and the privacy policy says exactly
that — so the page can never claim something untrue about itself.

`vercel.json` is generated too, so the Content-Security-Policy widens to allow
Google's hosts only while the ID is set and narrows again when it is cleared.
Any *other* third-party script needs its host adding to `build_vercel_json()`
in `content.py`, or the browser will block it.

Events sent: `whatsapp_click`, `phone_click`, `email_click`,
`instagram_click`, `cta_click`, `form_start`, `form_error`, `generate_lead`,
`faq_open`, `project_detail_open` — see the header of `analytics.js`.

## Content rules

These are enforced by convention, not by code, so please keep to them:

- No fabricated testimonials, client logos, awards, staff or metrics.
- Every project on the Work page carries its real stage: client project,
  active build, specified, or concept. A specification is never shown as a
  shipped product.
- Prices published as "from" are starting points; the real number comes from a
  written scope.
- No guaranteed rankings, lead counts or response times we cannot honour.

## Deploy

Push to `main`; Vercel builds from it and serves the result at
<https://mucolabs-in.vercel.app>.

No custom domain is attached yet: `mucolabs.com` and `mucolabs.in` have no DNS
records pointing anywhere, so neither resolves. There is no `CNAME` file — that
is a GitHub Pages mechanism and GitHub Pages is not serving this repository.
To go live on the real domain, add it in the Vercel project settings and point
DNS at the records Vercel gives you.

## Known limitations

The enquiry form is client-side only: it opens WhatsApp or the visitor's email
app with the message pre-filled. Nothing is stored or transmitted by the page.
Server-side validation, spam protection, lead storage and transactional email
need a backend, which this repository does not have yet.
