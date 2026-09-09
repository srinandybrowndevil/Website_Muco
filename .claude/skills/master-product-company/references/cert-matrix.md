# Test and certification matrix

Produce a coverage map. Run what applies. List skips with reasons. Never pretend.

## Universal

- Functional — in-scope stories, abort, refresh, deep link, CRUD, search, filter, sort
- UI states — component x state x breakpoint x theme
- Keyboard and assistive — tab order, focus trap, skip link, name/role/value
- Cross-browser / device — Chromium, Firefox, WebKit; mobile Safari + Android Chrome for web
- Integration — auth, mail, maps, storage, webhooks; duplicate delivery; clock skew
- API / contract — schema, authz, pagination, versions, rate limits
- Data — migrations, encoding, TZ, money, soft delete, deletion rights
- Performance — budgets, query plans, payload, spike/soak
- Reliability — dependency down, token expired, restart mid-request
- Security — session, IDOR, injection, XSS, CSRF, SSRF, secrets, verbose 500s, reachable CVEs. Impact + fix only
- Privacy — consent actually blocking, PII in URLs/logs, retention
- Accessibility — WCAG 2.2 AA unless told otherwise
- i18n — overflow, broken concat, RTL, silent fallback
- DevOps — pinned artifacts, gated prod, ready vs live, smoke in pipeline
- Support / docs — recoverable errors, request IDs, docs match product
- Analytics — events fire once, named stably

## Website extra

- SEO / share / crawl — title, meta, canonical, robots, sitemap, OG, structured data
- Redirect and domain hygiene

## App extra

- Real-device matrix, permission matrix, offline, background, upgrade, push, deep link, store listing vs binary, crash-free, start time
- VoiceOver / TalkBack and font scale

## Ecommerce extra

- Catalog truth, cart math, coupon math, tax math
- Payment success / fail / pending / double submit / late webhook
- Oversell guard, refund / RMA, admin audit on paid order edits
- Sale-day load

## Software extra

- Tenancy isolation, contract compatibility, backup restore drill, flag kill switch, SLO vs sales promise
- AI features — eval, fallback, data leak into prompts

## Certification bar

Certified means evidence for all of the following that apply — smoke, critical-path e2e, security sanity, perf budget, a11y smoke, privacy sanity, rollback drill, plus commerce payment sanity or app store-compliance sanity when those products apply.

## Growth extra (public website or store)

- Title, H1, canonical, robots, sitemap plan on primary templates
- Rendered text equals visible claim
- FAQ / answer blocks only when content is true
- Product pages unique and factual when commerce applies
- OG/share cards
- Intent map from R&D has a page owner
