# Master Rebuild — Public Website

**Station:** Frontend / SEO / conversion implementation
**Date:** 16 September 2026
**Brief:** `MUCO_LABS_CLAUDE_MASTER_WEBSITE_SEO_UIUX_PROMPT.md`
**Prepared for:** Srinivash Mahalingam, Founder, MUCO LABS

## A. Executive summary

The brief covers eleven phases. This session completed Phases 0 through 6 and
parts of Phases 8, 9 and 10. **Phase 7 — the complete English/Tamil bilingual
site — has not been started, and it is the single largest outstanding item.** It
is reported honestly in section O rather than partially implemented, because the
brief itself forbids partial translation (§21: "If Tamil is enabled for a route,
it must not silently fall back to partial English strings").

What changed: the site now has one conversion concept instead of three, no
sign-in anywhere in the public journey, one combined WhatsApp/Call control
instead of scattered buttons, a course catalogue you navigate rather than scroll
past, and a homepage positioned at India level while keeping Erode as a genuine
local signal.

## B. Current architecture

```text
Framework:           None. Python static site generator (build.py) emitting plain HTML.
Rendering:           Fully static. No client framework, no hydration.
Deployment:          Vercel. buildCommand runs scripts/build-site.mjs, which now
                     runs build.py first and packages public-site/.
Database dependency: None.
Email provider:      Resend, via api/lead.js. Server-side validation.
Analytics:           GA4 (G-ZZNRHGTEVJ) + GTM (GTM-W2XZ8QNQ), both gated behind
                     Consent Mode v2. analytics.js translates events; it stores
                     nothing and posts to no endpoint of ours.
i18n system:         None yet. See section O.
```

## C. Routes

Final public English routes — 28 pages, all indexable except `404`:

`/`, `/services`, `/services-websites`, `/services-mobile`,
`/services-product-design`, `/services-software`, `/services-business-systems`,
`/services-marketing`, `/services-ai-automation`, `/services-support`, `/work`,
`/pricing`, `/about`, `/learning`, `/learning-portal`, `/contact`, `/faq`,
`/maintenance`, `/careers`, `/website-audit`, `/website-development-erode`,
`/website-cost-erode`, `/business-website-growth`, `/textile-software`,
`/privacy`, `/terms`, `/refund`, `/404`.

Tamil routes: **none.** Not implemented.

## D. Removed legacy behaviour

| Removed | Where it was | Now |
|---|---|---|
| "Free Consultation" / "Get a Free Project Consultation" as a competing global CTA | header, mobile menu, hero, three page-level CTAs, footer quick links, `final_cta()` default | All resolve to `Start a Project` → `/contact#start-project`. Site-wide count: 174 occurrences of "Start a Project", 0 of "Free Consultation". |
| "Sign in" link to `client.mucolabs.com/login` | desktop header and mobile menu on all 28 pages | Gone. `PORTAL_LIVE = False`; `PORTAL_LOGIN_LINK` and `MOBILE_PORTAL_LOGIN_LINK` are empty strings. |
| MUCO client-workspace CTA on the learning portal page | `learning_pages.py` account note | Replaced with copy explaining learning accounts live at Way2Me, plus a Start-a-Project link for business enquiries. |
| Portal-gated WhatsApp, phone and email | `PORTAL_CONTACT` routed direct contact through login | All direct contact is now genuinely direct. |
| Separate floating WhatsApp and Call CTAs | header button plus mobile bar | One `Contact` dock (desktop) and one bottom dock (mobile), each offering exactly WhatsApp and Call. |

One reference to `client.mucolabs.com` remains, in `work.html`: it describes the
MUCO LABS platform project's own four workspaces. That is portfolio content
about what was built, not an account CTA, and §4.2 explicitly protects it.

## E. Design work

Shared components changed, with the file that owns each:

- **Header actions** (`build.py`) — single accent CTA plus a quiet `Contact`
  disclosure. The dock is a native `<details>`, so it is keyboard-operable and
  works without JavaScript.
- **Mobile contact dock** (`build.py`, `style.css`) — WhatsApp, Call and Start a
  Project in one bar. Start a Project gets `flex: 1.4` and the accent fill so the
  dock never out-shouts the primary conversion.
- **Footer** (`build.py`, `style.css`) — location line, phone and email as real
  links, and a social row driven by `SOCIAL_LINKS`.
- **Lead form** (`growth_content.py`) — a `#start-project` anchor target, offset
  for the fixed header.
- **Course catalogue** (`learning_pages.py`, `main.js`, `style.css`) — category
  chips, paging, focus handling.

## F. Learning redesign

- **Categories:** six, derived from the actual catalogue, each chip carrying a
  real count, plus an "All subjects · 65" chip.
- **Filters:** chips, the search box and the subject select are ANDed. Changing
  any of them resets paging to the first page.
- **Paging:** 12 cards on first render; "Load more courses" adds 12 at a time.
  Verified in Chromium: 12 on load, 24 after one click, and the button hides
  itself when the matched set is exhausted.
- **Content separation:** all 65 listings ship in the HTML. Paging is applied on
  top, so crawlers and no-JavaScript visitors still see the entire catalogue —
  the chips filter what is already on the page rather than being the only route
  to it (§29).
- **Mobile:** chips wrap; each is a 44px target.
- **Focus:** Load more moves focus to the first newly revealed card, so a
  keyboard user is not dropped back at the top of a 65-item list.

## G. SEO implementation matrix

All 28 pages pass `scripts/site-audit.py`: unique title, unique description
within 50–165 characters, correct self-canonical, social tags, heading order and
alt text. The notable changes this session:

| URL | Primary intent | Title | Change |
|---|---|---|---|
| `/` | website and software development company, India level | Website & Software Development Company in India \| MUCO LABS | Retargeted. It previously read "…in Erode", competing directly with `/website-development-erode` for the same local result. The two now cover two layers instead of one. |
| `/contact` | start a project / enquiry | Start a Project with MUCO LABS \| Erode, India & Remote | Retitled away from "Free Project Consultation" to match the single CTA. |
| `/learning` | course discovery | unchanged | Gained an `ItemList` of 65 `Course` entries, provider Way2Me. |

## H. Keyword map

Not produced this session. The brief (§6, §H) asks for an intent map built from
"verified search demand", and no keyword-volume data source was available in
this environment. Inventing volumes would violate §57 and §H's own instruction:
"Do not invent search volume if it was not obtained from a real source."

What exists instead is the page-to-intent structure implied by the route set
above, plus `delivery/growth/SEARCH-OPPORTUNITY-MAP.md` from an earlier session.
A real keyword map needs Search Console or a keyword tool connected.

## I. Multilingual implementation

**Not implemented.** See section O.

## J. Performance

Measured on the homepage before this session's changes: 13 requests, 218 KB,
CLS 0, DOM content loaded 386 ms. This session added one `<details>` element,
one nav row and roughly 1 KB of CSS — no JavaScript library and no new network
request. The deploy package dropped from 7.1 MB to 5.5 MB earlier in the day
when a 1.77 MB unused PNG was replaced with a 39 KB JPEG.

A fresh LCP/INP/CLS measurement on the deployed build has **not** been taken.
The earlier numbers are from localhost and are not a substitute for field data.
No Lighthouse score is quoted, because none was run.

## K. Tests

| Check | Result |
|---|---|
| `npm test` (contract tests) | 3 suites, 3 passed, 0 failed |
| `python scripts/site-audit.py` | 28 pages, nothing failing |
| `python build.py` idempotency | byte-identical across consecutive runs |
| `node scripts/build-site.mjs` | 28 pages generated and packaged, 5.5 MB |
| `node --check` on edited scripts | clean |
| Internal links and anchors | 0 broken across 28 pages |
| Browser (Chromium) | no console errors on `/`, `/contact`, `/learning` |
| Responsive: 320, 360, 430, 768, 1280, 1440 | no horizontal overflow at any width |
| Learning filter, chips, Load more, empty state | all verified interactively |
| Contact dock | opens, correct links, 44px targets, inside viewport |
| Honeypot (§4.3) | not reproducible: 1×1px at `left:-9999`, `tabindex="-1"`, `aria-hidden`, not visible |

Not run: Firefox, WebKit, real-device testing, Lighthouse, axe.

## L. Files changed

`build.py`, `content.py`, `growth_content.py`, `learning_pages.py`, `main.js`,
`style.css`, `analytics.js`, `api/lead.js`, `api/event.js`,
`scripts/build-site.mjs`, `scripts/dev-site.mjs`, plus the 28 generated `.html`
files, `sitemap.xml`, `robots.txt`, `llms.txt`, `vercel.json`.

## M. Files removed

`assets/yogahari.png` moved to `project-images/yogahari.png` (a gitignored
source directory). Nothing else deleted.

## N. Environment variables

Names only: `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL`,
`LEAD_ALLOWED_ORIGIN`.

## O. Remaining blockers and unfinished work

### Blockers needing the owner

1. **LinkedIn URL.** `build.py` has `LINKEDIN = ""` with a comment explaining
   why. No LinkedIn link renders anywhere and no URL is guessed. Set the verified
   value and it appears in the footer, the contact page and the Organization
   `sameAs` at once, because all three read `SOCIAL_PROFILES`.
2. **GTM container contents.** Whether Microsoft Clarity actually loads cannot be
   determined from this repository. The privacy policy no longer asserts either
   way.

### Not implemented — Phase 7, English/Tamil

This is the largest item in the brief and none of it is built. Honestly scoped,
it needs:

- a locale-aware route layer in `build.py` emitting `/ta/...` for every page;
- reciprocal `hreflang` plus `x-default`, per-locale canonicals and `html lang`;
- a locale-partitioned sitemap;
- a language switcher and first-visit browser-language preference with
  persistence, layered on top of indexable URLs rather than replacing them;
- a Tamil-capable font strategy with subsetting, tested for overflow;
- a terminology glossary;
- **genuine Tamil copy for 28 pages** — navigation, headings, body, CTAs, form
  labels, validation messages, success states, FAQs, metadata and alt text.

The last item is the real weight, and it is a translation project rather than an
engineering one. Machine-translating it would produce exactly the "literal
machine translation" §21 rules out.

Recommended approach: enable Tamil route by route, starting with the conversion
core (`/`, `/services`, `/contact`, `/about`), and ship a `/ta` route only once
its page is fully translated. No page then falls back to partial English, and
pages without a Tamil version simply carry no `hreflang` pair.

### Not implemented — other

- **§13 content depth.** Service pages were not expanded to the fifteen-point
  structure.
- **§14 content clusters.** No editorial articles were written.
- **§16 location pages.** No opportunity matrix and no new city pages. Correct to
  defer: the brief requires demand research first.
- **§30 design tokens.** The existing token set was extended, not rebuilt.
- **§45 per-page OG images.** Still one shared `og-image.jpg`.
- **§51 Search Console.** No credential available in this environment.
- **§52 off-site authority plan.** Not written. It is marketing work rather than
  code, and the brief asks for it to be kept separate.

## P. Ongoing SEO actions

**Completed in code this session:** a single canonical conversion path; removal
of account gating from the public journey; homepage and local-page
de-cannibalisation; course-catalogue crawlability preserved under paging;
`Course` structured data; canonical and robots hygiene on the 404; and
deploy-from-source, so published HTML can never lag the generator again.

**Requires ongoing effort, not code:** keyword research against real demand data;
editorial content clusters; Tamil translation; Google Business Profile and
citation consistency; earned links and digital PR; Search Console monitoring of
the target-query set.

**On the Top-3 objective:** per §5, no ranking is claimed and nothing in this
report asserts a position. What was delivered is implementation coverage of
controllable on-site factors, which is the only part a repository can affect.
