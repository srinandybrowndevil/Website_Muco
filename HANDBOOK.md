# Site Handbook

Where everything on mucolabs.com lives, and what stops you.

This file is hand-written and stays put. `README.md` is **generated** by
`build_readme()` in `content.py`, so anything written there is erased by the next
build — that is why this is a separate file.

Line numbers were correct at commit `cee3646`. Every structure below is named in
capitals, so if a file shifts, searching for the name finds it faster than
counting lines.

---

## The one rule

**Never edit the `.html` files.**

The 32 HTML files in the repository root — `index.html`, `about.html`,
`services-websites.html` and the rest — are generated output. They are committed
so the deploy is reproducible, not so they can be edited. Change one by hand and
the next `python build.py` overwrites it without warning.

Edit the Python that produces it. The rest of this file says which Python.

---

## How a build runs

1. **You run `python build.py`.** That file ends with
   `import content; content.build_all()`. It is the whole entry point.
2. **`build_all()` walks a list of pages** — `content.py:4045`. A list of
   `(filename, function)` pairs, with the eight service pages, three growth pages
   and four Tamil pages appended in loops.
3. **Each page goes through `render()`** in `build.py`. It adds the shell, head
   tags, header, footer, schema and analytics, then runs two post-processors that
   rewrite your markup. See "Two traps" below.
4. **HTML is written to the repository root.** Tamil pages go to `ta/`. Nothing is
   deleted first, so a page you stop generating leaves its old file behind until
   you remove it.
5. **Vercel runs `node scripts/build-site.mjs`.** That script runs `build.py`
   itself, then copies the public files and the `ta/` folder into `public-site/`,
   which is what gets served. Source, tests and `.env` are deliberately left out.

---

## File map

| File | Lines | What it owns |
|---|---|---|
| `build.py` | 1,057 | Company facts, navigation, footer, page shell, schema, shared HTML helpers, the Tamil locale map |
| `content.py` | 4,084 | Services, projects, FAQs, pricing, about, legal, the Erode page. The one you will open most |
| `growth_content.py` | 358 | The enquiry form, contact page, shared contact section, three local-SEO pages |
| `tamil_content.py` | 583 | The four Tamil pages, with their own header and footer |
| `learning_pages.py` | 168 | Learning page and learning portal |
| `style.css` | 4,707 | All styling. Design tokens at `:root`, line 122 |
| `main.js` | 1,012 | Form validation, consent bar, mobile nav, scroll reveals, learning filters |

---

## I want to change…

| What | Where |
|---|---|
| Phone, email, brand name, tagline | `build.py:29–34` |
| Instagram, LinkedIn | `build.py:34`, `:42` |
| Top navigation | `build.py:460` — `NAV` |
| Footer columns, legal links | `build.py:470`, `:485` |
| A service: title, outcome, bullets | `content.py:363` — `SERVICES` |
| Service page: who it is for, deliverables | `content.py:456` — `SERVICE_DETAIL` |
| What changes the price, exclusions, timeline | `content.py:1298` — `SERVICE_SCOPE` |
| Extra FAQs on one service | `content.py:1194` — `SERVICE_FAQ_EXTRA` |
| Which group a service appears under | `content.py:1849` — `SERVICE_GROUPS` |
| A project on the work page | `content.py:32` — `PROJECTS` |
| Site-wide FAQs | `content.py:609` — `FAQS` |
| Pricing page | `content.py:2257` — `build_pricing()` |
| Industries, process steps | `content.py:515`, `:591` |
| Privacy, terms, refund | `content.py:3073` / `:3160` / `:3243` |
| Enquiry form choices | `growth_content.py:9` — `SERVICE_CHOICES` |
| The three local-SEO pages | `growth_content.py:286` — `GROWTH_PAGES` |
| Colours, spacing, fonts, radius | `style.css:122` — `:root` |
| Tamil navigation and pages | `tamil_content.py:25`, `:578` |
| Publishing a new Tamil page | `build.py` — `TAMIL_TWINS` |
| "Last updated" date on legal pages and sitemap | `build.py:110` — `SITE_REVISED` |

Three of those deserve a sentence:

- **`PROJECTS`** — only entries with `"featured": True` appear on the work page.
  `"stage"` sets the honesty badge: client, live, build, spec or concept.
- **`TAMIL_TWINS`** — publishing a Tamil page is two steps on purpose. Write it in
  `tamil_content.py`, then add its slug here. Only the second step creates the
  hreflang pair and the sitemap entry, so a half-finished translation can never be
  advertised to Google as a complete one.
- **`SITE_REVISED`** — bump by hand when content genuinely changes. It is
  deliberately not `date.today()`; that would tell Google every page changed every
  day.

---

## What stops you

The build refuses rather than shipping something half-wired. Each message names
exactly what was forgotten.

| Message | Meaning |
|---|---|
| `services missing from SERVICE_GROUPS` | You added a service but did not put it in a group, so it would exist and appear nowhere |
| `FAQ questions missing from FAQ_GROUPS` | You added a question but did not group it. It would vanish from the page while staying in the FAQ schema — the mismatch Google flags |
| `… needs three or more price factors / exclusions` | A new service has an incomplete `SERVICE_SCOPE`. Those sections are the "no hidden scope" promise; a thin one breaks it |
| `… timeline note is too thin` | Same entry. Under 150 characters is not an answer |
| `icon() called with no glyph` | You referenced an icon name not in `ICONS`. Without this check the page shipped a correctly sized, perfectly empty box and reported nothing |

---

## Commands

| Command | What it does |
|---|---|
| `python build.py` | Rebuild every page. Identical input gives identical output |
| `npm run dev` | Local server on port 8123. Read the first trap below before using the form |
| `python scripts/site-audit.py` | All 32 pages: titles, descriptions, canonicals, social tags, heading order, alt text, duplicate ids, title width, sitemap |
| `npm test` | Contract tests for the enquiry endpoint |
| `npx playwright test tests/marketing.spec.ts` | 122 browser tests, desktop and mobile. What CI runs |
| `node scripts/build-site.mjs` | Produce the deploy bundle in `public-site/`, as Vercel does |

---

## Two traps

### The local form sends real email

`npm run dev` loads `.env`, which holds a live Resend API key. Submitting the
enquiry form on `localhost:8123` sends a genuine email to `founder@mucolabs.com`.

This has happened twice. To test the form, run the Playwright tests — they
intercept the request and send nothing.

### Two post-processors rewrite your markup

`band_sections()` replaces the class on almost every `<section>` it touches, and
`rule_labels()` rewrites section eyebrows into numbered rules.

So CSS written against `.section-divider` matches **nothing** in the output, and a
band class you hardcode ends up fighting one the post-processor assigns. If a
style looks correct in `style.css` and does nothing on the page, this is almost
always why.

Check the built HTML, not the template.
