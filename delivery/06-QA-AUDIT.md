# Station 6 — QA Audit

**Product:** mucolabs.com and portal.mucolabs.com
**Classification:** Website + Software
**Loop:** 1
**Date:** 10 September 2026
**Gate applied:** Open S0 or S1 fails. Open S2 fails unless accepted in writing. S3 and S4 pass with a punch list.

---

## Result

**FAIL.** One S1 and one S2 finding remain open. Neither is a defect in the shipped code, and neither can be closed by this operator: one requires a credential change only the account holder can make, the other requires a paid plan.

Every finding raised against the code itself is now fixed and re-tested. F-01, F-02 and F-03 were closed in the first pass of this loop; F-06, F-07, F-08 and F-10 were closed in the second, on instruction. F-09 is partly closed — the work of closing it uncovered F-11, a real defect the administrator screens had been hiding.

## Findings table

| ID | Title | Severity | Layer | Type | Owner | Fixable | Status |
|---|---|---|---|---|---|---|---|
| F-01 | Audit log accepted invented action names and unbounded volume | S2 | backend | vulnerability | Backend | Yes | Fixed this loop |
| F-02 | Trigger function exposed on the public API surface | S3 | backend | vulnerability | Backend | Yes | Fixed this loop |
| F-03 | Link text "Read more" gives no destination | S3 | frontend | accessibility | Frontend | Yes | Fixed this loop |
| F-04 | Sole administrator credential is known-exposed | S1 | process | vulnerability | Founder | Yes, by the account holder only | Open |
| F-05 | Leaked-password protection disabled | S3 | infra | vulnerability | Founder | Mitigated in the application | Mitigated, re-rated from S2 |
| F-06 | Enquiry endpoint deployed with no caller | S3 | backend | reliability | Backend | Yes | Fixed this loop |
| F-07 | Authorisation checks re-evaluated per row in 23 policies | S3 | data | perf | Backend | Yes | Fixed this loop |
| F-08 | 21 foreign keys without a covering index | S3 | data | perf | Backend | Yes | Fixed this loop |
| F-09 | Administrator interface never rendered signed in | S3 | process | docs | Founder | Partial | Partly closed |
| F-10 | Crawl file excludes a page that is not built | S4 | growth | docs | Frontend | Yes | Fixed this loop |
| F-11 | Intern certificate rendered without the holder's name | S2 | frontend | bug | Frontend | Yes | Fixed this loop |
| F-12 | Onboarding could create a second customer record | S3 | data | bug | Backend | Yes | Fixed this loop |
| F-13 | Query errors discarded in eight places | S3 | frontend | reliability | Frontend | Yes | Fixed this loop |

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

**F. Fixable.** Yes. Done in the application; the platform setting still needs a plan.

**G. How to fix.** Applied where it counts. The portal now checks every password it sets against the public breach corpus itself, which is the same job the paid feature does.

The password never leaves the browser. It is hashed there, and only the first five characters of that hash are sent; every corpus entry sharing those five characters comes back — over two thousand of them — and the comparison happens locally. Neither this server nor the corpus service can tell which entry was of interest. The lookup is proxied through the portal rather than called from the browser directly, so the content security policy stays limited to the portal and Supabase, and the visitor's address is never handed to a third party on the page where they are typing a password.

The check runs at submit, when the password is final, on both sign-up and password recovery. If the corpus cannot be reached the account is still created: the local rules — length, character classes, and the common and predictable lists — always apply, and refusing to let anyone sign up because a third party is unreachable would be the worse failure.

**Residual, and why this is S3 rather than closed.** This covers the two flows the portal owns. A password set through a platform-level path the portal does not render would not pass through it. The paid plan closes that remainder, and still brings point-in-time recovery, which is a separate gap in the backup story.

**H. Proof.** Verified against the live corpus. `password` is refused, reported 52,372,427 times and returned among 2,125 candidates. `Qwerty123!` is refused too — it satisfies every local rule and would have been accepted before, which is exactly the gap this closes. A strong unique passphrase passes. Malformed input to the endpoint is refused with 400, a GET with 405. The whole path was exercised in the browser under the portal's own content security policy.

One defect was found and fixed while testing this: the proxy sent the endpoint to the sign-in page, because the pages that call it belong to people who are not signed in. Left there, the check would have reported itself unavailable forever and nothing would have said so.

**I. Prevent.** Re-check the advisor after any plan change.

**J. Who.** Founder decides. This is a cost decision, not an engineering one.

---

### F-06 — Enquiry endpoint deployed with no caller — S3, fixed

**A. What.** `api/lead.js`, deployed as a serverless function.

**B. How to see.** No page posts to it since contact actions moved behind portal sign-in. The repository README already records this.

**C. Why.** The contact form was removed; the endpoint that served it was not.

**E. Impact.** An unauthenticated endpoint that accepts input and can send email is live with no legitimate traffic. It is defended — method check, rate limit, honeypot — so this is unused surface rather than an open door. It also has no monitoring, so abuse would be invisible. Severity S3, likelihood rare.

**F. Fixable.** Yes.

**G. How to fix.** Applied on instruction. `api/lead.js` and its contract test are removed, the local development server no longer routes to it, and the documentation now states plainly that contact actions live in the portal. `RESEND_API_KEY`, `LEAD_TO_EMAIL` and `LEAD_FROM_EMAIL` are gone from the example environment file with them: the site now holds no mail credentials at all, because it sends no mail.

**H. Proof.** No reference to the endpoint or its variables remains in the source, the generated README, the deployment guide or the example environment. The site rebuilds and the remaining contract test passes.

**I. Prevent.** If an anonymous form returns, it comes back with its own review rather than by reviving code that sat unused and unwatched.

**J. Who.** Backend owns.

---

### F-07 — Authorisation checks re-evaluated per row in 23 policies — S3, fixed

**E. Impact.** Each policy calls `auth.uid()` once per row rather than once per statement. At current data volumes this is not measurable. It becomes measurable in the thousands of rows. Severity S3, likelihood environmental.

**G. How to fix.** Applied on instruction. All 23 policies now call `(select auth.uid())`, which PostgreSQL evaluates once per statement instead of once per row. The value cannot change mid-statement, so this is an optimisation and nothing else.

The earlier decision to defer was not wrong, and the condition that made deferring safe is the condition under which it was done: rewriting access-control policies risks opening a hole, so the rewrite is only as trustworthy as the verification behind it.

**H. Proof.** Two layers. Structurally, all 23 policies match their previous name, command, permissiveness and target roles exactly, none still evaluates per row, and no table gained a policy it did not have. Behaviourally, eighteen access checks were re-run against production: a client sees only their own customer, project, invoice and request and none of the other client's; source archives stay invisible; a client cannot mark their own invoice paid or grant themselves administrator; an employee sees their own pay and not another person's and cannot raise it; the audit log stays administrator-only. The intern date lockout was the one most at risk, because it passes the identity into a function inside a subquery — an active intern can still write a work log, an expired one is refused, and reads still continue after the window closes. Every probe row was removed afterwards.

**I. Prevent.** Any future policy edit should run the same probe suite before it is called done. A policy rewrite verified only by reading it is not verified.

**J. Who.** Backend owns.

---

### F-08 — 21 foreign keys without a covering index — S3, fixed

**E. Impact.** Joins and cascading deletes scan rather than seek. Not measurable at current volume. Severity S3.

**G. How to fix.** Applied on instruction, in the same migration as F-07 so the performance work is one reviewable change. All 21 covering indexes are added. None is speculative — each covers a real foreign key, which is what a parent-row delete and a reverse join both need.

The cost is honest and worth stating: each index adds a little write time on every insert. This database already carries 16 unused indexes. If write volume ever grows enough to feel it, the ones whose parent rows are never deleted and never joined backwards are the ones to drop.

**J. Who.** Backend owns.

---

### F-09 — Administrator interface never rendered signed in — S3, partly closed

**A. What.** `/admin/audit`, `/admin/people` and the administrator screens generally.

**C. Why.** No administrator session is available to this operator, and entering the account password is out of bounds.

**E. Impact.** The data layer beneath these screens is proven by direct probes. The rendering path is proven only by compile, lint, build, and an anonymous request that correctly redirects to sign-in. A rendering defect that appears only with real data would not have been caught. Severity S3, likelihood rare given the type checks, but the risk is real and is stated rather than implied away.

**G. How to fix.** Partly applied. The live render still needs the founder, and that part cannot be delegated. What could be tested without a session was: the queries these screens issue were replayed against the live API anonymously. That works because PostgREST resolves a query's table relationships before it applies row security, so an anonymous call separates "this query is malformed" from "this query is fine and you may see nothing".

That check found F-11, a real defect on a page that had never been opened with data. It is the exact class of fault this finding was pointing at, which is the argument for the founder spending the remaining ten minutes rather than assuming the screens are fine.

**H. Proof.** Every embedded query the portal issues now resolves: the audit log, the people list, the team settings list, compensation with its payments, the request detail with its customer, and the corrected certificate query. One did not, and is recorded as F-11.

**J. Who.** Founder verifies the live render; Frontend fixes anything found.

---

### F-10 — Crawl file excludes a page that is not built — S4, fixed

**A. What.** `robots.txt` disallows `/logo-showcase.html`, which the site generator does not produce.

**E. Impact.** None functionally. It is a stale line that misleads the next person reading the file. Severity S4.

**G. How to fix.** Applied. The line is removed from the generator and the file rebuilt.

**J. Who.** Frontend owns.

---

### F-11 — Intern certificate rendered without the holder's name — S2, fixed

**A. What.** `portal/src/app/intern/certificate/page.tsx`, the query that reads the intern's record.

**B. How to see.** Replay the query the page issues: ask the API for `intern_profiles` with a `profiles(full_name)` embed. It returns error `PGRST201`, not a row.

**C. Why.** `intern_profiles` reaches `profiles` by two different foreign keys — once as the intern, once as the mentor. An unqualified embed is therefore ambiguous, and PostgREST refuses to guess which was meant. The page then compounded it: the error was discarded rather than read, so the failure had no way to announce itself.

**D. Why now.** Present since the certificate page was written. The mentor link was added in the same migration that created the table, so the embed has never been unambiguous.

**E. Impact.** The certificate is the document an intern shows an employer. With the record unread, the page still rendered — with "Not recorded" in place of the holder's name and an empty track. It printed a certificate that certified nobody. Severity S2, likelihood always: this failed for every intern, every time. It was found only because the queries were replayed directly. Nothing in the type checks, the lint or the build could have caught it, because the code is valid and the fault is in what the database was asked.

**F. Fixable.** Yes.

**G. How to fix.** Applied. The embed now names its foreign key, so there is nothing to disambiguate. The page also stops discarding the two query errors: a failure to read either record now stops the page with a plain message. Printing a certificate with a placeholder where the name belongs is worse than not printing one.

**H. Proof.** The corrected query resolves against the live API. Every other embed the portal issues was replayed too, and all resolve.

**I. Prevent.** Two rules earn their place. An embed on a table with more than one path to the same table must name its foreign key. And a query whose error is discarded will eventually fail silently — the pattern to avoid is destructuring only `data` when `error` exists alongside it.

**J. Who.** Frontend owns.

---

### F-12 — Onboarding could create a second customer record — S3, fixed

**A. What.** `complete_customer_onboarding()` and `portal/src/app/complete-profile/page.tsx`.

**B. How to see.** Both look for an existing customer before creating one. Neither holds a lock between looking and creating, and no constraint backed either. The page also discarded the error from its own lookup, so a transient failure read as "no customer yet".

**C. Why.** Check-then-insert without a constraint is an invariant hoped for rather than enforced. Two requests arriving together — a double-tapped button, a retry after a timeout — could both find nothing and both proceed.

**E. Impact.** A duplicate customer record splits one person's projects, invoices and files across two rows, and the row-level policies key on that record. Severity S3, likelihood rare: it needs a race, or an error at one specific moment. No duplicates exist today; this was checked before the fix.

**G. How to fix.** Applied. `customers.auth_user_id` now carries a unique constraint, which cannot be raced. NULL stays unconstrained by design, because a customer record the founder creates before that person has an account has no account attached and there may be many. The application checks stay, since they give a better message than a constraint violation, but the guarantee no longer rests on them. The page now reads the error from its own lookup and stops rather than continuing.

**J. Who.** Backend owns.

---

### F-13 — Query errors discarded in eight places — S3, fixed

**A. What.** Eight server and page components destructured a query result for its data and ignored the error beside it.

**B. How to see.** Search the portal for a query result taken as `data` alone. Eleven were found; eight needed changing.

**C. Why.** The same habit that produced F-11. When only `data` is taken, a failed query is indistinguishable from a query that found nothing, and the code proceeds on the second reading.

**E. Impact.** It varies by site, which is why each was judged rather than swept. The administrator authorisation checks failed closed, so nobody gained access they should not have — but they reported "you do not have access" when the truth was "the check could not run", sending the reader off to fix an account that was never the problem. The workspace router sent an existing customer to the onboarding form as though their account did not exist. The intern work log rendered a form whose every submission would be refused with no explanation. Severity S3, likelihood rare — each needs a query to fail.

**F. Fixable.** Yes.

**G. How to fix.** Applied to eight. A failed check now says so, distinctly from a refusal.

Three were deliberately left, because falling back is the right behaviour there and changing it would be worse: the proxy treats an unreadable session as signed-out and sends the visitor to sign in, which is the correct direction to fail; the customer shell falls through a chain to the account email for a display name; the workspace refresh poller simply retries. Each is a considered fallback, not an ignored error.

**I. Prevent.** The pattern to watch for is a Supabase result destructured for `data` with `error` left beside it. It reads as harmless, and it is how both F-11 and F-12 became possible.

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

The bar is not met because F-04 (S1) is open. F-05 is re-rated S3: the risk it described is now closed in the application, with a stated residual that only a plan upgrade removes. Neither is a defect in the shipped code. F-04 closes with a password change. F-05 closes with a plan upgrade, or with the founder accepting the risk in writing, at which point the gate would pass with a single S3 item — the live render of the administrator screens, which only the founder can perform.

Every other finding raised in this loop, including F-11 which was found while closing F-09, is fixed and re-tested.

## Loop-back instructions for R&D

The failures are not design failures, and the brief does not need rewriting. Two root classes are worth carrying into the next loop:

1. **Trust boundary at the audit surface (F-01).** The design named the events to record but not who may assert one. When a system records claims, the vocabulary of permitted claims belongs in the brief alongside the events themselves.
2. **Operational security is in scope (F-04, F-05).** Both open findings are process and plan, not code. A specification that covers access control but not credential handling and plan-dependent protections leaves its strongest guarantees resting on an unstated assumption.
