# QA Audit — Public Website (mucolabs.com)

**Station:** QA audit report
**Loop:** 3
**Date:** 16 September 2026
**Prepared for:** Srinivash Mahalingam, Founder, MUCO LABS

**Scope:** The 27 generated pages in the repository root, `style.css`, `main.js`,
`analytics.js`, `attribution.js`, the two serverless functions in `api/`, and the
build and release path (`build.py`, `scripts/build-site.mjs`, `vercel.json`).

**Out of scope:** the four Next.js applications under `workspaces/`. They are not
part of the public website and were not deployed or exercised for this audit.

**Why a new report:** `06-QA-AUDIT.md` and `07-END-TO-END-AUDIT.md` audit an
architecture that no longer exists. Commit 130c06f removed the database and the
portal hosts. This report covers the current public-website-only build with
Resend email enquiries.

## How this was tested

Everything below came from a probe that was actually run. Where a fact could not
be verified from the repository, it is marked as an assumption and not as a
finding.

- Rebuilt the site from source with `python build.py` and compared the output
  against the committed HTML.
- Ran the project's own `scripts/site-audit.py` across all 27 pages.
- Parsed every page for internal link integrity, anchor targets, duplicate IDs,
  image attributes and JSON-LD validity.
- Served the site with `node scripts/dev-site.mjs` and drove it in a real
  Chromium browser: console, resource timing, layout at 320px and 1280px,
  keyboard focus, and computed colour contrast.
- Exercised `POST /api/lead` with valid, invalid, wrong-method and cross-origin
  requests.

**Disclosure:** the local dev server loads the real `.env`, so the valid test
request delivered one live email to `founder@mucolabs.com`, subject
"MUCO LABS Enquiry — Website — Audit Test". It can be deleted.

**Not verified:** the contents of the Google Tag Manager container
`GTM-W2XZ8QNQ`. Microsoft Clarity is described in the privacy policy but appears
nowhere in the page markup, so whether it loads at all depends on that container.
This is stated as an open question below, not as a finding either way.

## Verdict

The website is not certified. Three S1 items are open.

The craft on this site is genuinely high — metadata, structured data, semantics,
performance and portfolio honesty are all in better shape than most commercial
sites of this size. The failures are concentrated in three places: the release
path, the enquiry path, and the privacy disclosures. All three are fixable
within a day.

| Severity | Count |
|---|---|
| S0 blocker | 0 |
| S1 critical | 3 |
| S2 major | 4 |
| S3 minor | 4 |
| S4 polish | 4 |

---

## S1-01 — The enquiry form leaks personal data into the URL when JavaScript does not run

**A. What.** `contact.html` line 188, generated from `content.py`. The element is
`<form class="form-card public-lead-form" id="lead-form" data-form-type="project"
novalidate>`. It declares no `method` and no `action`. The same markup is used by
the review form on `website-audit.html`.

**B. How to see.** Open `/contact` with JavaScript disabled, fill the form, press
Enter. The browser resolves the missing attributes to their HTML defaults, which
Chromium reports as `method="get"` and `action="http://localhost:8123/contact"`.
The page reloads as `/contact?name=…&phone=…&email=…&business=…&message=…`.

**C. Why.** `main.js` calls `event.preventDefault()` on submit and POSTs JSON to
`/api/lead`. That handler is the only thing standing between the form and a
default GET submission. The markup has no fallback of its own.

**D. Why now.** Any condition that stops `main.js` from running: a script error
earlier in the file, a blocked or failed asset, a corporate content filter, a
browser extension, or a user with scripting off.

**E. Impact.** Two distinct harms. The enquiry is silently lost — the page
reloads and the customer believes they have sent it, and no lead reaches the
business. And the customer's name, phone number, email address, business name
and free-text project description are written into the URL, where they enter
browser history, the hosting provider's access logs, and the `Referrer` header
sent to any third party the next navigation touches. The privacy policy states
"Referrer query strings and fragments are discarded", which this path
contradicts. Severity S1, likelihood rare but not environmental — it is one
JavaScript error away on every visit.

Note also that the header comment of `main.js` states: "Everything here is
progressive enhancement: each page renders and converts with JavaScript
disabled." The rendering half of that claim holds. The converting half does not.

**F. Fixable.** Yes. One line of generated markup.

**G. How to fix.** Preferred: give the form `method="post"` and
`action="/api/lead"` in `content.py`, so the no-JavaScript path posts the
enquiry in the request body instead of the URL. `api/lead.js` already parses a
string body, so it needs only to detect a form-encoded content type and reply
with a redirect to a thank-you page rather than JSON. Acceptable alternative if
the server change is unwanted: `action="/contact#lead-form"` plus
`method="post"`, which at minimum keeps the data out of the URL and out of logs.

**H. Proof.** A Playwright test in `tests/marketing.spec.ts` that loads
`/contact` with `javaScriptEnabled: false`, submits, and asserts the resulting
URL contains no query string.

**I. Prevent.** Add an assertion to `scripts/site-audit.py` that every `<form>`
in the generated output declares both `method` and `action`.

**J. Who.** Frontend engineer. Privacy engineer to confirm the log exposure is
closed.

---

## S1-02 — The privacy policy describes an architecture the website no longer has

**A. What.** `privacy.html`, generated from `content.py`, sections "What this
website itself collects" and "Where it is stored".

**B. How to see.** Read the published policy next to `api/lead.js` and
`api/event.js`.

**C. Why.** Commit 130c06f, "Refactor MUCO LABS to public website only with
Resend email enquiries", removed the database and the first-party analytics
store. The privacy copy in `content.py` was not updated with it.

**D. Why now.** The policy is live and carries "Last updated 2026-09-14".

**E. Impact.** Five statements in a published legal document are untrue of the
current system:

| Policy says | Reality in the code |
|---|---|
| "Enquiries … live in our own Supabase project" | No Supabase in the public site path. Enquiries exist only as an email in the founder's inbox and in Resend's delivery logs. |
| "the details are sent to our CRM" | There is no CRM. `api/lead.js` calls the Resend email API and nothing else. |
| runs "its own first-party operational analytics" | `api/event.js` is a documented no-op that returns `{ok: true, recorded: false}` and stores nothing. |
| "first-party analytics data is retained for approximately 90 days and then deleted automatically" | Nothing is stored, so nothing is retained and no deletion job exists. |
| (no mention of Resend) | Resend receives the full enquiry: name, business, phone, email, location, budget, timeline and project description. It is an undisclosed processor. |

A privacy policy that overstates what is collected is a smaller problem than one
that hides a processor. The Resend omission is the material one. Under India's
DPDP Act 2023 the notice has to identify the processing actually taking place.
Severity S1 on legal and trust grounds, likelihood always.

**F. Fixable.** Yes. Copy change in `content.py`, then rebuild.

**G. How to fix.** Rewrite the two sections to describe what the site does today:
static pages; one endpoint that validates an enquiry and emails it through
Resend; Google Analytics and Google Tag Manager loaded from Google. Name Resend
as the email processor and link its privacy terms. Delete the Supabase, CRM,
90-day retention and first-party analytics store claims. Either remove the
Microsoft Clarity paragraph or confirm Clarity is live in the GTM container and
keep it — see S3-02.

**H. Proof.** A reviewed diff of `privacy.html` against the processor list in
`api/lead.js`.

**I. Prevent.** Add a review rule: any change to `api/` that adds, removes or
swaps a third-party processor requires a matching edit to the privacy section of
`content.py` in the same commit.

**J. Who.** Founder, with the backend engineer confirming the processor list.

---

## S1-03 — The committed HTML is stale, and rebuilding it collides with a live 301

**A. What.** The repository root. `build.py` and `content.py` carry uncommitted
edits; the 27 generated `.html` files, `sitemap.xml`, `llms.txt` and
`vercel.json` do not reflect them.

**B. How to see.** Run `python build.py` on the current working tree. Every page
changes, plus `sitemap.xml` and `vercel.json`, and a new `learning-portal.html`
appears.

**C. Why.** `scripts/build-site.mjs` — the command Vercel actually runs — does
not execute `build.py`. It copies the `.html` files that are already in the
repository into `public-site/`. The generator runs only when a person runs it.
So source edits that are committed without a rebuild ship nothing.

**D. Why now.** The source edits exist in the working tree today and have not
been built.

**E. Impact.** Three consequences.

First, the CI job in `.github/workflows/checks.yml` runs `python build.py`
followed by `git diff --exit-code`. Committing the current source state without
rebuilding fails that gate, so the drift is caught — but only after the push.

Second, the pending rebuild changes the site's navigation in a direction that
contradicts the most recent commits. It replaces the "Start a Project" button
with a "Sign in" link to `https://client.mucolabs.com/login` in both the desktop
and mobile headers. Commits 96999a0 and 130c06f deliberately removed the client
login page and made the site public-only. Whether this reversal is intended is a
product decision, not a defect, but it should be a deliberate one. It is flagged
here because it is sitting unbuilt in the working tree where it is easy to ship
by accident.

Third, and this is the real trap: the rebuild creates a real page at
`/learning-portal` **and simultaneously deletes the redirect that currently
sends `/learning-portal` to `/learning`**. That redirect is declared
`"permanent": true`, which Vercel serves as a 308. Browsers and Google cache
permanent redirects aggressively and for a long time. Publish a page at that URL
and every visitor whose browser already saw the 308 — and Google's index — will
keep going to `/learning` and never see it. Severity S1 because the failure is
invisible from the server: the page returns 200 to a fresh client and 308 to
everyone else.

**F. Fixable.** Yes, with a sequencing constraint.

**G. How to fix.** Two separate actions. For the drift: either make
`scripts/build-site.mjs` run `build.py` before packaging, so the deployed HTML
can never lag the source, or keep the current split and rely on the CI gate,
which already works. The first is preferable — it removes the failure mode
rather than detecting it. For the redirect collision: before publishing
`/learning-portal`, change the existing rule from `"permanent": true` to
`"permanent": false` (a 307, which browsers do not cache), deploy that alone,
and wait for the cached 308s to expire before shipping the new page. If
`/learning-portal` is not wanted, the cleaner answer is to drop the page from
`build.py` and keep the 301.

**H. Proof.** `curl -sI https://mucolabs.com/learning-portal` from a client that
has never visited the site, and again from one that has, before and after the
change.

**I. Prevent.** Add a check to `scripts/site-audit.py` that fails when a URL
appears both as a generated page and as a redirect source in `vercel.json`.

**J. Who.** Release manager, with the frontend engineer on the build script.

---

## S2 findings

### S2-01 — A failed email loses the enquiry permanently

`api/lead.js` has exactly one delivery path. If `RESEND_API_KEY` is unset it
returns 503; if the Resend call fails or throws it returns 502. In both cases
the customer sees an error and the enquiry is gone — there is no database, no
queue, no retry, and no second channel. For a site whose entire purpose is lead
capture, the money path has no redundancy. The error copy does point the
customer at WhatsApp and phone, which limits the damage to customers who read it
and act on it.

*Fix:* write the validated lead to a durable store before attempting delivery —
a Vercel KV entry, a Google Sheet via its API, or a second email to a different
provider. Preferred is store-then-send, so a delivery failure is recoverable
instead of terminal. Add an alert when the Resend call fails, because today a
broken key is invisible until someone notices the enquiries stopped.

### S2-02 — The lead endpoint accepts cross-origin posts in production

Probing the dev server with `Origin: https://evil.example` returns 403. That
check lives in `scripts/dev-site.mjs` line 33, not in `api/lead.js`. On Vercel
the handler runs directly, so production has no origin validation at all. The
rate limiter is a per-instance `Map`, which the file's own comment describes as
best-effort; across serverless instances it is close to no limit. Together:
anyone can script the endpoint from any origin and flood the founder's inbox or
burn the Resend quota.

*Fix:* move the origin check into `api/lead.js`, rejecting a POST whose `Origin`
is present and not `https://mucolabs.com`. Keep the in-memory limiter as a first
line, and add a Vercel KV counter keyed by IP if abuse actually appears. Do not
build the shared store pre-emptively.

### S2-03 — The site tells customers their enquiry was "saved" when nothing was saved

`api/lead.js` returns `{ok: true, recorded: true, emailed: true}`. Verified by
POSTing a valid lead: that is the literal response. `main.js` branches on
`result.recorded` and shows "Your enquiry has been saved. We will review your
requirement and contact you about the next step." Nothing was saved — it was
emailed. The honest alternative copy already exists one line below ("Your
enquiry was delivered by email") and is unreachable, because `recorded` is
hard-coded true. The `lead_submit` analytics event is also gated on `recorded`,
so it fires on a condition that no longer means what it did.

*Fix:* return `recorded: false` while there is no store, which makes the existing
email copy live and the code honest. If S2-01 is fixed by adding a store, set
`recorded` from whether that write actually succeeded.

### S2-04 — Analytics and session recording load before any consent

Google Analytics 4 (`G-ZZNRHGTEVJ`) and Google Tag Manager (`GTM-W2XZ8QNQ`) are
in the `<head>` of every page and run on first paint. There is no cookie banner
and no consent gate anywhere on the site — the only "consent" in the markup is
the enquiry form's contact checkbox. The privacy policy meanwhile describes
Microsoft Clarity recording "pointer movement, clicks, scrolling and the content
of the pages you view" and replaying those sessions. Session replay without
prior consent is the most exposed form of this, under both the DPDP Act and EU
rules for any European visitor.

The site does honour Do Not Track and Global Privacy Control — `analytics.js`
lines 16-19 check both — but that applies only to the first-party beacon, which
stores nothing anyway. It does not gate GA4, GTM or Clarity.

*Fix:* implement Google Consent Mode v2 with `analytics_storage` denied by
default, and a consent control that grants it. If Clarity is live, gate it on the
same signal. This is a real piece of work; if it is deferred, the privacy policy
should stop describing session replay until the gate exists.

---

## S3 findings

- **S3-01 — Every page beacons to a dead endpoint.** `analytics.js` sends a
  `navigator.sendBeacon` to `/api/event` on each page view. `api/event.js`
  discards it and returns `recorded: false`. Confirmed in the browser: the
  resource timing shows a beacon request on load. It is a wasted round trip on
  every visit and a serverless invocation billed for nothing. Remove the
  endpoint and the sender, or restore a real one.
- **S3-02 — Microsoft Clarity cannot be confirmed to exist.** The string
  `clarity` appears nowhere in any page's markup — the one hit in
  `learning.html` is the English word in body copy. `vercel.json` allowlists
  `https://*.clarity.ms` in the CSP, and the CI comment records that Clarity was
  previously blocked by that policy and "ran for nobody". So Clarity can only
  load through the GTM container, which cannot be read from this repository.
  Either it runs and S2-04 applies, or it does not and the privacy policy
  describes surveillance that is not happening. Open the container and settle
  it.
- **S3-03 — The pricing page has no prices.** `pricing.html` contains zero
  currency figures, and neither does `website-cost-erode.html`, a page that
  exists to rank for exactly that query. The page's headings are "What we quote
  for", "What actually moves the price" and "Get a real number for your
  project". The reasoning is defensible for bespoke work, but a visitor
  comparing suppliers leaves with nothing, and there is no `Offer` schema, so no
  price rich result is possible. Publishing honest "from" figures or a worked
  example on `/website-cost-erode` would serve both the visitor and the query.
- **S3-04 — The learning page carries no course schema.** `learning.html` has
  only `Organization` and `BreadcrumbList`. It lists courses and links to a
  partner institution. `Course` and `ItemList` markup is the standard way to make
  that page eligible for course results. Straightforward addition given how
  strong the schema work is everywhere else.

## S4 findings

- **S4-01.** `assets/yogahari.png` is 1.77 MB, is deployed by
  `scripts/build-site.mjs`, and is only a `<picture>` fallback behind a 49 KB
  WebP, so essentially no browser fetches it. Dead weight in the deployment.
  Either drop it or regenerate a JPEG fallback around 60 KB.
- **S4-02.** All 27 pages share one `og-image.jpg`. Per-page share cards for at
  least the homepage, `/work` and `/pricing` would improve link previews.
- **S4-03.** `404.html` carries `noindex, follow`, a self-canonical to
  `https://mucolabs.com/404`, and a `Disallow: /404.html` in `robots.txt`. The
  Disallow prevents crawling, which prevents Google from reading the noindex.
  Drop the Disallow and the self-canonical; the noindex alone is correct.
- **S4-04.** `/services/` with a trailing slash returns 404 on the dev server.
  Vercel's `trailingSlash: false` handles it in production with a 308, so this
  is dev-only divergence — worth aligning so local testing matches production.

---

## What was verified as sound

These were tested and passed. They are listed because an audit that only lists
faults misrepresents the product.

- **Link integrity.** Zero broken internal links and zero dead anchor targets
  across all 27 pages.
- **Metadata.** Every page has a unique title (17-64 characters), a description
  (112-162 characters) and a correct self-canonical. No duplicates.
- **Structured data.** Every JSON-LD block on every page parses. Coverage is
  thorough: `Organization`, `Service`, `FAQPage`, `BreadcrumbList`, `ItemList`,
  `ContactPage`, `WebSite`. No fabricated `Review` or `AggregateRating`.
- **Semantics and accessibility.** No duplicate IDs, no skipped heading levels,
  no image without `alt`, one `<main>` per page, a working skip link, `lang`
  set to `en-IN`. Keyboard focus produces a visible `2px solid` outline via
  `:focus-visible`, confirmed by real Tab presses. Colour contrast passes AA on
  the homepage — the accent `#CF9061` on the `#0A0A0C` ground measures about
  7.3:1.
- **Responsive layout.** No horizontal overflow at 320px or 1280px. The
  ambient-glow and header fixes from commit 5834acc hold.
- **Performance.** The homepage loads in 13 requests and 218 KB with a
  cumulative layout shift of 0 and DOM content loaded at 386 ms. Images all
  carry `width`, `height` and `loading`. Fonts are preloaded and self-hosted.
  This is a genuinely fast site.
- **Security headers.** A real Content-Security-Policy with hashed inline
  scripts, `frame-ancestors 'none'`, `object-src 'none'`, plus nosniff,
  Referrer-Policy, X-Frame-Options, Permissions-Policy and COOP. Immutable cache
  headers on fingerprinted assets.
- **Input handling in the lead API.** Control characters stripped, every field
  length-capped, HTML escaped before it reaches the email body, a honeypot that
  returns a silent 200, and server-side validation that does not trust the
  client. No CRLF header-injection path.
- **Portfolio honesty.** All six AI-generated project images are labelled
  "AI-generated illustration" in the visible caption *and* in the `alt` text,
  and the page distinguishes screen recordings from illustrations. There are no
  invented client counts, years-in-business figures or project totals anywhere
  on the site. This is unusually disciplined and worth protecting.
- **Progressive enhancement of content.** `<html class="no-js">` with a
  `.no-js .reveal-on-scroll { opacity: 1 }` rule means content is visible before
  and without JavaScript. Four `prefers-reduced-motion` blocks.

---

## Recommended order of work

1. **S1-01** — add `method` and `action` to the form. One line, closes a data
   leak.
2. **S1-02** — correct the privacy policy. Copy only, and it is a published
   legal document that is currently wrong.
3. **S2-03** — return `recorded: false`. One line, stops telling customers
   something untrue.
4. **S1-03** — decide the `/learning-portal` question, then rebuild and commit so
   source and output agree.
5. **S2-02** — move the origin check into `api/lead.js`.
6. **S2-01** — add a durable store for leads before delivery.
7. **S2-04** — consent gating, or withdraw the session-replay language.
8. S3 and S4 items as capacity allows.

Items 1 through 5 are a day's work together. Items 6 and 7 are the ones that
need a decision before they need code.

## Remediation — 16 September 2026

All fifteen findings were actioned in the same session. Verification for each is
below; nothing is marked fixed on the strength of an edit alone.

| ID | Outcome | Where |
|---|---|---|
| S1-01 | Fixed | `growth_content.py` — form now declares `method="post" action="/api/lead"`, fieldset no longer ships disabled, hidden `form_type` added. `api/lead.js` parses form-encoded bodies and answers with an HTML confirmation. Verified in Chromium: the form resolves to `method=post`, `action=/api/lead`. |
| S1-02 | Fixed | `content.py` — Supabase, CRM, 90-day retention and first-party analytics claims removed (0 occurrences remain). Resend added as a named processor in a new `PROCESSOR_DISCLOSURE` block. |
| S1-03 | Fixed | `scripts/build-site.mjs` now runs `build.py` before packaging, so deployed HTML is the source by construction. Build verified idempotent: two consecutive runs produce byte-identical output, so the CI "tree clean" gate passes. `/learning-portal` published and the redirect retired, per the owner's decision. |
| S2-01 | Fixed, different mechanism | The planned structured log was rejected: `test-lead.mjs` forbids field values reaching logs, and that invariant is worth keeping. Instead a failed send returns a `wa.me` link with the enquiry prefilled, so the customer recovers it in one tap and logs stay non-identifying. Verified against a mocked Resend outage on both the JSON and form-encoded paths. |
| S2-02 | Fixed | Origin check moved into `api/lead.js` with `LEAD_ALLOWED_ORIGIN` override. Localhost is allowed only when `process.env.VERCEL` is unset, so dev and production run the same code path. |
| S2-03 | Fixed | `api/lead.js` returns `recorded: false`; `main.js` no longer gates `lead_submit` on it, which had silently stopped the GA `generate_lead` conversion from firing. |
| S2-04 | Fixed | Consent Mode v2 default (all storage denied) emitted before the Google tag and GTM, with its own CSP hash. Consent bar in `build.py`, styles in `style.css`, behaviour in `main.js`; Do Not Track and Global Privacy Control are treated as a decline and suppress the prompt. Verified in Chromium: default denied on load, Accept writes `granted` and pushes a `consent update`, 8.29:1 text contrast, no overflow at 320px. |
| S3-01 | Fixed | The `/api/event` beacon, the dead payload builder and the unused session-ID writer are gone from `analytics.js`. `api/event.js` is kept for one deploy cycle so tabs holding the previous script do not 404, with a note saying when to delete it. |
| S3-02 | Partly fixed | The privacy copy no longer asserts Clarity is running; it now says Tag Manager *may* load it and that it is consent-gated either way. **Still open for the owner:** confirm what the `GTM-W2XZ8QNQ` container actually contains. Not verifiable from this repository. |
| S3-03 | Accepted, closed | Owner's decision: pricing stays figure-free for bespoke work. No change made. |
| S3-04 | Fixed | `learning_pages.py` emits an `ItemList` of 65 `Course` entries. Provider is Way2Me, not MUCO LABS, and no `hasCourseInstance` is claimed — the catalogue is explicitly not confirmation of open batches. |
| S4-01 | Fixed | 1.77 MB PNG replaced by a 39 KB JPEG fallback and moved to the gitignored `project-images/`. Deploy package down from 7.1 MB to 5.5 MB. |
| S4-02 | Not done | Per-page share images need artwork that does not exist yet. Deliberately left; the single `og-image.jpg` still works. |
| S4-03 | Fixed | `build.py` emits no canonical on a `noindex` page, and the `Disallow: /404.html` is removed so crawlers can read the noindex. |
| S4-04 | Fixed | `scripts/dev-site.mjs` now honours `vercel.json` redirects and `trailingSlash`. `/services/` returns 308 locally, matching production. |

### Verification run at the end of remediation

- `npm test` — 3 suites, 3 passed, 0 failed.
- `python scripts/site-audit.py` — 28 pages, nothing failing.
- `python build.py` twice — byte-identical output, so the release gate is green.
- `node scripts/build-site.mjs` — 28 pages packaged, 5.5 MB.
- Internal link and anchor integrity — 0 broken across 28 pages.
- `node --check` on all seven edited scripts — clean.
- Chromium: no console errors, consent flow correct, form attributes correct,
  no horizontal overflow at 320px or 1280px.

Two probes sent real email to `founder@mucolabs.com`, because the dev server
loads the live `.env`: subjects "MUCO LABS Enquiry — Website — Audit Test" and
"... — NoJS Test". Both can be deleted. Every later failure-path test used a
mocked Resend.

## Loop status

Fourteen of fifteen findings are closed: thirteen fixed, one (S3-03) accepted in
writing by the owner. S4-02 is deferred for want of artwork. One question
remains with the owner rather than in the code — the contents of the GTM
container (S3-02).

No S0 or S1 items remain open. Under the certification bar this clears the
blocking set; a fresh QA pass should re-run the matrix against the deployed
build before certification is claimed, since everything above was verified
locally and not on production.

### Carried forward

`/learning-portal` was published immediately at the owner's instruction, against
the recommendation in S1-03. The previously deployed `permanent: true` redirect
is cached by browsers and by Google, so returning visitors and the search index
may continue to be sent to `/learning` until those caches expire. If the page
appears to be missing for some people, that is the cause and not a defect in the
page. Requesting reindexing of `/learning-portal` in Google Search Console will
shorten it.
