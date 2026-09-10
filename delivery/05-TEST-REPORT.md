# Station 5 — Test Report

**Product:** mucolabs.com (public website) and portal.mucolabs.com (four-workspace software)
**Classification:** Website + Software
**Loop:** 1
**Date:** 10 September 2026
**Environments:** Supabase production project `iruolxedptsuhjlyagon`; local Next.js build; static site built from `build.py`

---

## Purpose

Execute the case list implied by the four-workspace specification and the shipped code, record expected against actual, and hand a verified defect list to QA. No case is reported as passing unless it was run.

## Inputs

- The four-workspace specification, sections 4, 6, 7, 8, 10, 13 and 14
- Shipped code through commit `0cd1188`
- Production database, read and probed under simulated identities

## Method and its limits

Database behaviour was tested by simulating each role inside PostgreSQL — setting the JSON Web Token claims (the signed identity a request carries) and the `authenticated` database role, then attempting the read or write as that person. This exercises the real policies rather than the interface in front of them.

Every refusal was re-run as the table owner to confirm the same statement would otherwise have touched a row. A statement that matches nothing is refused for the wrong reason and proves nothing. This control was added after a false positive in the previous phase.

**Declared skips.** These were not run and are not claimed:

| Area | Why | Risk carried |
|---|---|---|
| Administrator interface signed in as the founder | No administrator session available; entering the account password is out of bounds for this operator | Screen rendering with real data unverified |
| Cross-browser (Firefox, WebKit) | Only a Chromium browser is available in this environment | Rendering differences unknown |
| Real-device matrix and screen readers | No devices available | Assistive-technology behaviour inferred from markup only |
| Lighthouse and field performance | Not run this loop | Client performance budget unmeasured |
| Load and soak | No traffic to model | Behaviour under load unknown |

---

## Results

### Family A — Audit log integrity (specification 13)

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| A1 | Trigger records a write to `compensation` | 1 entry | 1 entry | Pass |
| A2 | Update entry names the change, not the figure | No amount present | `{"subject": "…", "amount_changed": true}` | Pass |
| A3 | Credential-shaped keys stripped from payload | Only benign key kept | `{"note": "kept"}` | Pass |
| A4 | Client reads the audit log | 0 rows | 0 rows | Pass |
| A5 | Client forges an entry | Refused | `new row violates row-level security policy` | Pass |
| A6 | Administrator reads the log | Rows visible | 3 rows | Pass |
| A7 | Administrator rewrites an entry | Refused | 0 rows updated | Pass |
| A8 | Administrator deletes an entry | Refused | 0 rows deleted | Pass |
| A9 | Control: owner updates that same entry | 1 row | 1 row | Pass — confirms A7 and A8 were refused by policy, not by an empty match |

### Family B — Intern tier packs (specification 14, item 10)

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| B1 | Two-month intern resolves their own pack | Six modules at declared levels | Six modules, correct levels | Pass |
| B2 | Non-intern resolves a pack | 0 rows, no default | 0 rows | Pass |
| B3 | Intern promotes their own tier | Refused | 0 rows updated | Pass |
| B4 | Control: owner updates that same row | 1 row | 1 row | Pass |
| B5 | Promotion changes the pack | Level differs | `client_code_redacted` moves from read to write | Pass |
| B6 | Any tier reaching customers, invoices or production | None | None — the module vocabulary is a database constraint, so those cannot be named | Pass |

### Family C — Audit surface abuse (added after the security advisor flagged the functions)

| # | Case | Expected | Actual before fix | Result |
|---|---|---|---|---|
| C1 | Client calls the trigger function directly over the API | Refused | `trigger functions can only be called as triggers` | Pass |
| C2 | Client invents an action name | Refused | Allowed — one entry written reading `founder.approved.everything` | Fail — QA finding F-01 |
| C3 | Forged entry attributed to someone else | Impossible | Own identifier only; nobody can be framed | Pass |
| C4 | Client floods the log | Bounded | 50 entries written unchecked | Fail — QA finding F-01 |

Re-run after the fix:

| # | Case | Actual after fix | Result |
|---|---|---|---|
| C2 | Invent an action name | `Unknown audit action founder.approved.everything.` | Pass |
| C5 | Declared action still records | 1 entry | Pass — the fix did not break the feature |
| C6 | 401 attempts from one account | 201 stored: 200 plus one marker | Pass |
| C7 | The dropped stretch is itself recorded | 1 marker | Pass |
| C8 | Trigger path unaffected by the vocabulary check | 1 entry | Pass |

### Family D — Routing and workspace separation

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| D1 | Anonymous request to `/admin/audit` | Sent to sign-in, destination kept | `/login?next=%2Fadmin%2Faudit`, HTTP 200 | Pass |
| D2 | `/admin/audit` resolves as its own route | Not swallowed by the catch-all segment | Listed separately in the build output | Pass |
| D3 | Twelve role-and-path routing cases | Correct workspace each time | All pass | Pass, carried from the previous loop |

### Family E — Website crawl hygiene and structure, 25 pages

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| E1 | Title present and within length | 25 of 25 | 25 of 25, 17 to 60 characters | Pass |
| E2 | Meta description present and within length | 25 of 25 | 25 of 25, 73 to 158 characters | Pass |
| E3 | Duplicate titles or descriptions | None | None | Pass |
| E4 | Canonical link | 25 of 25 | 25 of 25 | Pass |
| E5 | Exactly one first-level heading | 25 of 25 | 25 of 25 | Pass |
| E6 | Open Graph share tags | Four each | Four each | Pass |
| E7 | Language attribute | 25 of 25 | 25 of 25 | Pass |
| E8 | Duplicate element identifiers | None | None | Pass |
| E9 | Heading levels never skip | No skips | No skips | Pass |
| E10 | Sitemap covers indexable pages | 24 | 24, homepage included as the site root | Pass |
| E11 | Structured data valid and present | All but the error page | All but the error page, which is correctly excluded from crawling | Pass |
| E12 | Answer-engine access declared | Named agents allowed | Fifteen agents named; `llms.txt` present | Pass |

### Family F — Website accessibility structure, 25 pages

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| F1 | Images carry an alternative-text attribute | All | All | Pass |
| F2 | Form controls have an accessible name | All | All | Pass |
| F3 | Links and buttons have discernible text | All | All | Pass |
| F4 | Main landmark and skip link present | 25 of 25 | 25 of 25 | Pass |
| F5 | Link text describes its destination | All | One link read "Read more" | Fail — QA finding F-03; fixed and re-run clean |

### Family G — Build and type safety

| # | Case | Actual | Result |
|---|---|---|---|
| G1 | TypeScript compile | No errors | Pass |
| G2 | Lint | No findings | Pass |
| G3 | Production build | 29 routes generated, no errors | Pass |
| G4 | Static site build | 31 files, no errors | Pass |

---

## Summary

- Cases run: 47
- Passed: 44
- Failed: 3 — C2, C4 and F5. All three were fixed and re-tested within this station.
- Not run: the five areas declared above.

---

## Second pass — re-test after the punch list was closed

Run on instruction after QA, once F-06 through F-10 were fixed.

### Family H — Access control after the policy rewrite

All 23 policies were rewritten to evaluate the caller's identity once per statement instead of once per row. That is an optimisation on paper. On paper is not evidence, so the isolation guarantees were re-established from scratch against production.

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| H1 | Policy identities preserved | 23 of 23 match name, command, permissiveness, roles | 23 of 23 | Pass |
| H2 | Any policy still evaluating per row | None | None | Pass |
| H3 | Any table gained a policy | None | None | Pass |
| H4 | Client sees own customer / other client's | 1 / 0 | 1 / 0 | Pass |
| H5 | Client sees own project / other client's | 1 / 0 | 1 / 0 | Pass |
| H6 | Client sees own invoice / other client's | 1 / 0 | 1 / 0 | Pass |
| H7 | Client sees own request / other client's | 1 / 0 | 1 / 0 | Pass |
| H8 | Client sees any source archive | 0 | 0 | Pass |
| H9 | Client marks own invoice paid | Refused | 0 rows | Pass |
| H10 | Client grants themselves administrator | Refused | Row-level security violation | Pass |
| H11 | Active intern window state | active | active | Pass |
| H12 | Active intern writes a work log | Allowed | Allowed | Pass |
| H13 | Expired intern window state | closed | closed | Pass |
| H14 | Expired intern writes a work log | Refused | Row-level security violation | Pass |
| H15 | Expired intern amends a work log | Refused | 0 rows | Pass |
| H16 | Expired intern reads own work log | Still allowed | 1 row | Pass |
| H17 | Employee sees own pay / another person's | 1 / 0 | 1 / 0 | Pass |
| H18 | Employee raises their own pay | Refused | 0 rows | Pass |
| H19 | Client reads the audit log | 0 | 0 | Pass |
| H20 | Administrator reads the audit log | Rows visible | 4 | Pass |
| H21 | Client reads the profiles directory | Own row only | 1 | Pass |

The intern lockout cases (H11 to H16) carried the most risk, because that policy passes the caller's identity into a function inside a subquery — the shape most likely to change meaning when rewritten. It did not. All probe rows were removed afterwards.

### Family I — Query contracts on screens that were never opened

The administrator screens could not be rendered signed in. What could be tested is the queries they issue, replayed against the live API without a session. PostgREST resolves a query's table relationships before it applies row security, so an anonymous call separates a malformed query from a valid one returning nothing.

| # | Query | Expected | Actual | Result |
|---|---|---|---|---|
| I1 | Audit log with actor name | Resolves | Resolves; refused by policy, as it should be | Pass |
| I2 | People list with member names | Resolves | `[]` | Pass |
| I3 | Team settings with member names | Resolves | `[]` | Pass |
| I4 | Compensation with its payments | Resolves | `[]` | Pass |
| I5 | Request detail with customer contact | Resolves | `[]` | Pass |
| I6 | Certificate with holder name | Resolves | **`PGRST201`, ambiguous relationship** | **Fail — QA finding F-11** |
| I6 | Certificate, after naming the foreign key | Resolves | `[]` | Pass |

I6 is the finding this pass exists to justify. The certificate page had never been opened with data, its query was invalid, and its error was discarded — so it would have printed a certificate with "Not recorded" where the intern's name belongs. Nothing in the type check, the lint or the build could catch it: the code is valid, and the fault is in what the database was asked.

### Family J — Regression after removing the enquiry endpoint

| # | Case | Actual | Result |
|---|---|---|---|
| J1 | Remaining contract test | 1 test, passing | Pass |
| J2 | Static site build | Rebuilds clean | Pass |
| J3 | References to the removed endpoint or its variables | None in source, README, deployment guide or example environment | Pass |
| J4 | Portal typecheck, lint, build | No errors | Pass |

### Second-pass summary

- Cases run: 32
- Passed: 31
- Failed: 1 — I6, fixed and re-tested within the pass

## Handoff checklist for QA

1. Three failures are recorded with reproduction and evidence. Two share a root cause and are packaged as finding F-01.
2. The security advisor output is attached to the QA station and contains further items below the failure line.
3. Five test areas were not run. QA must carry them as unverified risk, not as absent risk.
4. No case in this report was marked passing on inspection alone.
