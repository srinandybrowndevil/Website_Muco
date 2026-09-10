# Station 6 — QA Audit

**Product:** mucolabs.com and portal.mucolabs.com
**Classification:** Website + Software
**Loop:** 1
**Date:** 10 September 2026
**Gate applied:** Open S0 or S1 fails. Open S2 fails unless accepted in writing. S3 and S4 pass with a punch list.

---

## Result

**FAIL.** One S1 and one S2 finding are open. Neither is a defect in the shipped code, and neither can be closed by this operator: one requires a credential change only the account holder can make, the other requires a paid plan.

Every finding raised against the code itself was fixed and re-tested inside this loop.

## Findings table

| ID | Title | Severity | Layer | Type | Owner | Fixable | Status |
|---|---|---|---|---|---|---|---|
| F-01 | Audit log accepted invented action names and unbounded volume | S2 | backend | vulnerability | Backend | Yes | Fixed this loop |
| F-02 | Trigger function exposed on the public API surface | S3 | backend | vulnerability | Backend | Yes | Fixed this loop |
| F-03 | Link text "Read more" gives no destination | S3 | frontend | accessibility | Frontend | Yes | Fixed this loop |
| F-04 | Sole administrator credential is known-exposed | S1 | process | vulnerability | Founder | Yes, by the account holder only | Open |
| F-05 | Leaked-password protection disabled | S2 | infra | vulnerability | Founder | Yes, with a paid plan | Open |
| F-06 | Enquiry endpoint deployed with no caller | S3 | backend | reliability | Backend | Yes | Open |
| F-07 | Authorisation checks re-evaluated per row in 23 policies | S3 | data | perf | Backend | Yes | Open, deferred with reason |
| F-08 | 21 foreign keys without a covering index | S3 | data | perf | Backend | Yes | Open |
| F-09 | Administrator interface never rendered signed in | S3 | process | docs | Founder | Yes | Open |
| F-10 | Crawl file excludes a page that is not built | S4 | growth | docs | Frontend | Yes | Open |

---

## Deep dives

### F-01 — Audit log accepted invented action names and unbounded volume — S2, fixed

**A. What.** `public.record_audit_event`, reachable at `/rest/v1/rpc/record_audit_event`, called by `portal/src/lib/audit.ts`.

**B. How to see.** Sign in as any client or intern. Call the function with an action string of your choosing. Before the fix, an entry reading `founder.approved.everything` was written and stored. Repeating the call 50 times stored 50 entries.

**C. Why.** The function validated the caller but never the claim. Any string was accepted as an action name, and nothing bounded the rate. The design assumed callers would be the three pages that were written; nothing enforced it.

**D. Why now.** Introduced with the audit log in commit `0cd1188`. Present from the moment the feature shipped.

**E. Impact.** The audit log is the evidence system for compensation access, certificate issue and client personal data. A signed-in person could write invented entries into it, or flood it to bury real ones. Two limits held throughout and materially reduce severity: the actor is forced to the caller's own identity, so nobody could ever be framed, and the table is append-only, so nothing existing could be altered or erased. Severity S2, likelihood common — no skill or timing is required.

**F. Fixable.** Yes.

**G. How to fix.** Applied. The vocabulary of permitted actions now lives in `public.audit_actions`, a table. An action not registered there is refused with a message naming the fix. A per-person cap of 200 entries per minute bounds volume; when it trips, one marker entry is written so the gap is itself visible in the log. The alternative — silently dropping unknown actions — was rejected because it would turn a forgotten registration into a quiet hole in the trail.

**H. Proof.** Re-run after the fix: the exact fabrication is refused; a declared action still records; 401 attempts store 201 entries; the marker appears once; the trigger path is unaffected.

**I. Prevent.** `supabase/tests/access_checks.sql` asserts the absence of update, delete and insert policies on the log and the presence of all five triggers, and writes a payload containing credential-shaped keys to confirm they are stripped.

**J. Who.** Backend owns. QA re-runs family C each loop.

---

### F-02 — Trigger function exposed on the public API surface — S3, fixed

**A. What.** `public.audit_write()`, exposed at `/rest/v1/rpc/audit_write`.

**B. How to see.** The database security advisor lists it under functions callable by the anonymous role.

**C. Why.** The function was created without revoking the default execute grant that Supabase extends to API roles.

**D. Why now.** Created with the audit log in this loop.

**E. Impact.** No exploit path exists. PostgreSQL refuses a direct call with "trigger functions can only be called as triggers", which was confirmed by test. The finding is unnecessary surface, not a live hole. Severity S3, likelihood rare.

**F. Fixable.** Yes.

**G. How to fix.** Applied. Execute revoked from the public, anonymous and signed-in roles.

**H. Proof.** `has_function_privilege` for the signed-in role now returns false.

**I. Prevent.** Every new definer function should revoke by default and grant only the role that needs it. Worth adding to the migration review checklist.

**J. Who.** Backend owns.

---

### F-03 — Link text "Read more" gives no destination — S3, fixed

**A. What.** A link on the homepage, generated from `content.py` line 1309.

**B. How to see.** List the links on the homepage with a screen reader, or read the rendered markup. One entry reads "Read more" with no context attached.

**C. Why.** The surrounding sentence carries the meaning. Read out of context, as assistive technology does when listing links, the link says nothing.

**D. Why now.** Present since the homepage section was written.

**E. Impact.** Fails WCAG 2.2 success criterion 2.4.4, Link Purpose in Context. A screen-reader user navigating by links cannot tell where it goes. Severity S3, likelihood always for that user group.

**F. Fixable.** Yes.

**G. How to fix.** Applied. The link now reads "Read more about Meyra", matching the pattern already used elsewhere in the same file.

**H. Proof.** Site rebuilt; the non-descriptive link check returns none across all 25 pages.

**I. Prevent.** The link-text check is part of the website structural audit and should run each loop.

**J. Who.** Frontend owns.

---

### F-04 — Sole administrator credential is known-exposed — S1, OPEN

**A. What.** The `founder@mucolabs.com` account, the only administrator of the production workspace.

**B. How to see.** The password for an account on this system was placed in a working transcript earlier in this engagement. It has not been confirmed changed since.

**C. Why.** A credential was shared in a working channel. Once written down outside a password manager, it must be treated as known.

**D. Why now.** The exposure has stood since it was written. It does not expire on its own.

**E. Impact.** The administrator account can read every client's contact details, every invoice, every person's compensation, and the audit log. It is also the only account that can grant access. Anyone holding the credential holds the workspace. The new audit log would record their actions, which is a real mitigation for detection but none at all for prevention. Severity S1, likelihood environmental — it depends entirely on who has seen the transcript.

**F. Fixable.** Yes, by the account holder only. This operator does not enter passwords and cannot rotate it.

**G. How to fix.** Change the password from the account's own settings. Prefer a passphrase generated by a password manager. Then review recent sign-in activity for that account.

**H. Proof.** None available to this station. Confirmation must come from the account holder.

**I. Prevent.** Credentials never go into chat, tickets, or commit messages. If one does, treat it as burned and rotate immediately rather than assessing likelihood.

**J. Who.** Founder owns and must confirm. QA cannot close this.

---

### F-05 — Leaked-password protection disabled — S2, OPEN

**A. What.** Supabase Auth configuration for the production project.

**B. How to see.** The database security advisor reports it as disabled.

**C. Why.** The feature requires a paid plan. The project is on the free tier.

**D. Why now.** Standing condition since the project was created.

**E. Impact.** New and changed passwords are not checked against known breach corpora, so a person can choose a password already published in a breach. Combined with a portal holding client contact details, invoices and compensation, this is the standard path for credential-stuffing. Severity S2, likelihood common — password reuse is the norm, not the exception.

**F. Fixable.** Yes, with a plan upgrade.

**G. How to fix.** Preferred: upgrade to the paid plan and enable the check; this also unlocks point-in-time recovery, which closes a separate gap in the backup story. Acceptable interim: the portal already refuses common and predictable passwords in `portal/src/lib/auth.ts`, which catches obvious cases but not breach corpora.

**H. Proof.** Advisor output will clear once enabled.

**I. Prevent.** Re-check the advisor after any plan change.

**J. Who.** Founder decides. This is a cost decision, not an engineering one.

---

### F-06 — Enquiry endpoint deployed with no caller — S3, open

**A. What.** `api/lead.js`, deployed as a serverless function.

**B. How to see.** No page posts to it since contact actions moved behind portal sign-in. The repository README already records this.

**C. Why.** The contact form was removed; the endpoint that served it was not.

**E. Impact.** An unauthenticated endpoint that accepts input and can send email is live with no legitimate traffic. It is defended — method check, rate limit, honeypot — so this is unused surface rather than an open door. It also has no monitoring, so abuse would be invisible. Severity S3, likelihood rare.

**F. Fixable.** Yes.

**G. How to fix.** Preferred: delete the function and its contract test, since the contact route is now the portal. Acceptable: keep it and alert on any invocation, since legitimate volume should be zero. Not changed in this loop because removing a deployed endpoint is a product decision and this station cannot see every possible consumer.

**J. Who.** Founder decides; Backend executes.

---

### F-07 — Authorisation checks re-evaluated per row in 23 policies — S3, open

**E. Impact.** Each policy calls `auth.uid()` once per row rather than once per statement. At current data volumes this is not measurable. It becomes measurable in the thousands of rows. Severity S3, likelihood environmental.

**G. How to fix.** Wrap the call as `(select auth.uid())`. Deferred deliberately; the reason is recorded in the migration. Rewriting 23 access-control policies for a performance gain that no current query experiences trades a real risk of introducing an access defect against no present benefit. Revisit when any guarded table passes roughly ten thousand rows.

**J. Who.** Backend owns; revisit on the volume trigger, not on a date.

---

### F-08 — 21 foreign keys without a covering index — S3, open

**E. Impact.** Joins and cascading deletes scan rather than seek. Not measurable at current volume. Severity S3.

**G. How to fix.** Add covering indexes on the listed columns. Best done alongside F-07 as one performance pass, informed by the queries the workspaces actually issue rather than by adding all 21 speculatively — an unused index costs write time on every insert, and the advisor already reports 16 unused indexes on this database.

**J. Who.** Backend owns.

---

### F-09 — Administrator interface never rendered signed in — S3, open

**A. What.** `/admin/audit`, `/admin/people` and the administrator screens generally.

**C. Why.** No administrator session is available to this operator, and entering the account password is out of bounds.

**E. Impact.** The data layer beneath these screens is proven by direct probes. The rendering path is proven only by compile, lint, build, and an anonymous request that correctly redirects to sign-in. A rendering defect that appears only with real data would not have been caught. Severity S3, likelihood rare given the type checks, but the risk is real and is stated rather than implied away.

**G. How to fix.** The founder opens each administrator screen once while signed in and reports anything wrong. This is the shortest path to closing it.

**J. Who.** Founder verifies; Frontend fixes anything found.

---

### F-10 — Crawl file excludes a page that is not built — S4, open

**A. What.** `robots.txt` disallows `/logo-showcase.html`, which the site generator does not produce.

**E. Impact.** None functionally. It is a stale line that misleads the next person reading the file. Severity S4.

**G. How to fix.** Remove the line, or restore the page if it was dropped by accident.

**J. Who.** Frontend owns.

---

## Growth and organic-lead assessment

The digital growth gate passes.

- **Crawl hygiene.** Title, description, canonical, single first-level heading, language attribute and Open Graph tags present on all 25 pages, with no duplicate titles or descriptions. The sitemap covers all 24 indexable pages.
- **Answer and generative engines.** `robots.txt` names fifteen agents explicitly, including those used by ChatGPT, Claude, Perplexity, Gemini, Copilot and Apple Intelligence, rather than relying on a wildcard. `llms.txt` carries a plain summary. This is ahead of common practice.
- **Structured data.** Present on every page except the error page, which is correctly excluded from crawling. `FAQPage` appears on 12 pages and `Service` on 18. All blocks parsed as valid JSON.
- **Rendered text equals the visible claim.** The site is statically generated, so what a crawler receives is what a visitor sees. There is no client-side rendering gap.
- **One observation, not a finding.** Twelve pages carry frequently-asked-question markup. That is only an asset while every answer stays true. It should be reviewed whenever pricing or service scope changes, because structured data that contradicts the page damages trust more than having none.

## Certification result

**Not certified this loop.**

Evidence exists for: functional smoke on the shipped features, critical-path access control, security sanity, accessibility structure, growth hygiene, and build and type safety.

Evidence does not exist for: cross-browser rendering, real-device and screen-reader behaviour, client performance budget, load behaviour, and the administrator interface rendered with real data.

The bar is not met because F-04 (S1) and F-05 (S2) are open. Neither is a defect in the shipped code. F-04 closes with a password change. F-05 closes with a plan upgrade, or with the founder accepting the risk in writing, at which point the gate would pass with an S3 and S4 punch list.

## Loop-back instructions for R&D

The failures are not design failures, and the brief does not need rewriting. Two root classes are worth carrying into the next loop:

1. **Trust boundary at the audit surface (F-01).** The design named the events to record but not who may assert one. When a system records claims, the vocabulary of permitted claims belongs in the brief alongside the events themselves.
2. **Operational security is in scope (F-04, F-05).** Both open findings are process and plan, not code. A specification that covers access control but not credential handling and plan-dependent protections leaves its strongest guarantees resting on an unstated assumption.
