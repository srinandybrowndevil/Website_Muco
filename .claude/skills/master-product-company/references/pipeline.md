# Factory pipeline

Run stations in this exact order. Each station ends with a professional English handoff file.

## Station 0 — Intake

- Capture the idea or prompt verbatim.
- Classify type using official order — website, e-commerce platform, app, software.
- List missing facts. Ask only what blocks R&D.
- Name the loop number (Loop 1, Loop 2, …).

## Station 1 — R&D (mandatory first)

Follow rnd.md.

Output: `01-RND-BRIEF.md`

Do not start Design without this file.

## Station 2 — Design

Follow design-handoff.md.

Input: R&D brief, plus QA audit if this is Loop 2+.

Output: `02-DESIGN-SPEC.md`

Must include information architecture, every screen/page, UI/UX rules, placeholders, empty/error/loading/success/offline states, component notes, accessibility, and motion.

## Station 3 — Frontend

Input: Design spec + R&D brief.

- Implement or specify routes, layout, components, states, client validation, a11y, SEO surface (titles, headings, canonicals, structured data hooks), performance budget on the client.
- Write the API contract the UI needs — methods, payloads, errors, empty lists.
- Do not fake backend success.

Output: `03-FRONTEND-HANDOFF.md` plus code when implementation is in scope.

## Station 4 — Backend

Input: Frontend handoff + R&D domain rules.

- Domain model, APIs, authn/authz, jobs, data integrity, idempotency.
- Commerce extras when applicable — catalog, cart, price, tax, stock, order, payment webhooks.
- App extras when applicable — device auth, push, sync.
- Observability — request IDs, structured logs, no PII in logs.

Output: `04-BACKEND-HANDOFF.md` plus code when implementation is in scope.

## Station 5 — Tester

Input: All prior handoffs + running surface if it exists.

- Build a case list from the design spec and domain rules.
- Execute functional, state-matrix, form, a11y smoke, perf smoke, security sanity, growth-surface checks (indexable titles, schema, answer-engine fragments).
- Record expected vs actual. No “looks fine.”

Output: `05-TEST-REPORT.md`

## Station 6 — QA audit

Input: Test report + product surface.

- Follow audit-protocol.md and cert-matrix.md.
- Classify every issue with finding-template.md.
- Produce the master professional report from professional-report.md.
- Gate:
  - Open S0 or S1 → fail. Return to R&D.
  - Open S2 → fail unless user accepts in writing. Return to R&D.
  - Only S3–S4 remain → pass with a punch list.

Output: `06-QA-AUDIT.md` and `00-MASTER-REPORT.md`

## Loop-back rule

When QA fails:

1. Pack open findings (A–J) into `07-RND-RETURN.md`.
2. R&D re-analyzes root classes, not symptoms.
3. Design updates only what the new brief changes.
4. Frontend / Backend change only the affected contracts and code.
5. Tester re-runs the failed family plus adjacent regression.
6. QA writes a new audit. Increment the loop number.

Never restart from Frontend while the brief is still wrong.

## Digital growth gate (every loop)

Before QA can pass a public website or store:

- Crawl hygiene exists (title, H1, canonical, robots, sitemap plan).
- Answer / generative engine fragments exist for primary intents (AEO / GEO / AIO).
- Internal links and content slots match the R&D intent map.
- Commerce catalog pages have unique, true, indexable content rules.
- Tracking plan does not invent vanity events.

Organic lead design is part of quality, not a later marketing ticket.
