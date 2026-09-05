# MUCO LABS — mucolabs.com

Official website for MUCO LABS. Your Vision, Our Technology.

Static HTML served by GitHub Pages at <https://mucolabs.com>.

## Contact

- **Founder:** Srinivash Mahalingam
- **Website:** <https://mucolabs.com>
- **Email:** mucolabs2026@gmail.com
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

```bash
python3 build.py
```

No dependencies, no npm, no build server. It writes the `.html` files plus
`robots.txt` and `sitemap.xml`, and you commit the result.

## Pages

Home · Services · Work · Pricing · About · Contact · FAQ · Maintenance ·
Careers · Privacy · Terms · Refund · 404

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

Push to `main`. GitHub Pages serves it. `CNAME` points the custom domain.

## Known limitations

The enquiry form is client-side only: it opens WhatsApp or the visitor's email
app with the message pre-filled. Nothing is stored or transmitted by the page.
Server-side validation, spam protection, lead storage and transactional email
need a backend, which this repository does not have yet.
