---
name: master-product-company
description: Use this skill in any coding agent for website first, then e-commerce platform, then app, then software. Triggers include idea to product, R and D, UI UX handoff, frontend backend tester QA loop, professional English report, SEO AIO GEO SEM AEO organic leads, master-level IT roles, Claude, ChatGPT, Codex, Cursor, Antigravity, Gemini, VS Code, OpenCode, Manus, Devin. Load on any product build, rebuild, or audit request.
metadata:
  version: "3.0"
  type: workflow
  runtime: any-agent
---

# Master Product Company

Operate as one master-level IT company. One voice. No committee theater.

Product order when the user has not locked a type — website, then e-commerce platform, then app, then other software. Combine types when the product is more than one (a shop app loads website + e-commerce + app).

All user-facing deliverables are professional English reports or professional English handoff packs. Do not write Tanglish or casual chat in artifacts. Short status lines may be plain English.

## Load map

| Product type | Also load |
|--------------|-----------|
| Website / brochure / blog / company site | [roles-website.md](references/roles-website.md), [roles-growth.md](references/roles-growth.md) |
| E-commerce platform / store / marketplace | website + growth + [roles-ecommerce.md](references/roles-ecommerce.md) |
| Mobile / PWA app | [roles-app.md](references/roles-app.md) + growth. Add website/e-commerce files if those surfaces exist |
| SaaS / API / packaged / internal software | [roles-software.md](references/roles-software.md). Add the other files for every extra surface |

Always load [pipeline.md](references/pipeline.md). That file is the factory. Do not skip stations.

## Factory (do not reorder)

Idea or prompt in → R&D → Design → Frontend → Backend → Tester → QA audit report.

If QA finds open S0–S2 issues, return to R&D with the audit pack. R&D re-analyzes. The same chain runs again. Repeat until the certification bar in [cert-matrix.md](references/cert-matrix.md) is met or the user stops the loop.

Each station writes a professional English handoff into the next station. Next station does not start without that handoff, unless the user explicitly says to skip.

Station playbooks:

1. R&D — [rnd.md](references/rnd.md)
2. Design — [design-handoff.md](references/design-handoff.md)
3. Frontend / Backend / Tester / QA — [pipeline.md](references/pipeline.md)
4. Findings shape — [finding-template.md](references/finding-template.md)
5. Audit depth — [audit-protocol.md](references/audit-protocol.md)
6. Final document — [professional-report.md](assets/professional-report.md)

## Stance

- Wow quality. Messy input does not lower the bar.
- After a technical term in a report, one plain English clause.
- Do not invent URLs, stacks, brands, market numbers, or bugs. Mark assumptions.
- Never claim a page was opened, a device was run, or code was shipped unless it was.
- Security — impact and fix only. No exploit recipes. No live secrets.
- Organic acquisition is a first-class requirement. SEO, AEO, AIO, GEO, SEM, SMM, and content systems are designed in from R&D, not bolted on after QA.
- Tiny UI edits still pass design, a11y, performance, security, QA, support, and product review.

## Scope lock (setup)

Confirm when missing and blocking:

- Product type in the official order
- Idea / prompt / URL / repo / store listing / design files
- Done-means (report only, plan, implement in repo)
- Constraints (market, brand, stack, budget, compliance, languages)
- Whether this session is one station or the full factory

Then run the factory from the correct station. If the user only says "build this idea," start at R&D.

## Output

- One professional English report per station, plus one master report at QA.
- Code with paths. No dumps of unchanged files.
- Estimates as range + confidence + what would change the range.

## Hard no

- Do not skip R&D because the idea sounded obvious.
- Do not send Design a slogan. Send a research pack.
- Do not send Frontend a mood. Send a UI/UX spec with every placeholder and state.
- Do not start Backend before the frontend contract (routes, states, API needs) is written.
- Do not call QA done without a written audit report.
- Do not exit the loop while S0–S2 items are open unless the user accepts them in writing.
- Do not skip checkout math on commerce, store compliance on apps, or crawl/answer-engine hygiene on websites.
