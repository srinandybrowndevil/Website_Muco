# End-to-End Audit — Five Live Hosts

**Product type:** Website (mucolabs.com) and Software (four workspace subdomains)
**Loop:** 2
**Date:** 11 September 2026
**Prepared for:** Srinivash Mahalingam, Founder and Chairman, MUCO LABS
**Result:** Three S2 findings raised and fixed. One S4 remains open and needs a tool this environment does not have. Two migrations are written and verified against the schema but not applied, because the database connector is disconnected.

---

## 1. Executive summary

Every public surface was inspected: the marketing site and the four workspace addresses, live over TLS, plus the shared portal address that older links still point to. All five answer correctly. Each workspace subdomain redirects an unauthenticated visitor to its own sign-in page carrying the destination they asked for, which is the routing behaviour specified for the four-workspace split.

The marketing site is in genuinely good condition, and that is worth stating plainly because most of this report describes defects. Twenty-five pages carry a title, a description of sensible length, a canonical link and the three social tags. Every page has exactly one first-level heading and no skipped heading levels. Every image carries alternative text and explicit dimensions. No two pages share a title or a description. Structured data covers twenty-four pages, including forty-nine questions marked up for answer engines with a median answer length of 199 characters, short enough to be extracted and long enough to answer. Cumulative layout shift measured zero. The homepage transfers 119 kilobytes across sixteen requests with no third-party blocking resources.

Three defects were found that a page-by-page reading of the code would not have surfaced. Each was found by measuring the running system.

The first was on the phone. The primary call to action in the mobile menu rendered ivory text on the copper accent at a contrast ratio of 2.31 to 1, below the 4.5 to 1 that WCAG AA requires at that size. The same button in its small and large variants measured 7.01 to 1. A rule intended to remove the menu underline from buttons had never removed the menu text colour, and the menu selector outranks the button rule.

The second was crawl control. The robots file was not on the proxy public list, so all five hosts answered a crawler with a redirect to the sign-in page. A crawler that follows a redirect to an HTML page treats the site as having no robots file, so none of these addresses has ever carried a crawl directive. The per-page instruction not to index was doing the entire job alone, and that instruction only exists on responses that render HTML.

The third was in the security header. The portal shipped permission to evaluate arbitrary strings as code in its production Content-Security-Policy. That permission exists for a development-time feature and is never used by a production build.

## 2. Method

Live hosts were measured, not assumed. Timing, TLS verification, redirect targets and response headers were taken from the running services. Page structure, structured data, internal linking and crawl files were parsed from the built output. Contrast was computed from resolved styles in a real browser at a phone viewport with the menu open. The security-policy change was verified against a production build rather than the development server, because the two differ precisely where this defect lived.

Two automated checks were added to the repository so these classes of defect cannot return silently, and both were tested against the bug they exist to catch before being kept. An audit that has never been watched to fail should not be trusted.

## 3. Findings

### S2-1 — Primary call to action failed contrast on phones

**What.** The Start a Project button inside the mobile navigation menu, `style.css`.
**How to see.** Open the homepage at 375 pixels wide, open the menu, inspect the button.
**Why.** `.mobile-menu a` sets a text colour with specificity 0,1,1. `.btn-accent` sets its own with 0,1,0 and loses. The companion rule `.mobile-menu .btn` already existed to undo the menu border on buttons, and never undid the colour.
**Impact.** The single most important control on the site, at 2.31 to 1, on the device most visitors use. Accessibility and conversion.
**Fix.** Restore the button ink inside the menu for accent and primary variants. Now 7.01 to 1.
**Proof.** Measured in a browser before and after. A regression test fails with the fix removed, naming the button and the ratio.

### S2-2 — Five hosts asked crawlers to sign in

**What.** The robots file on admin, client, intern, employee and portal.
**How to see.** Request it. It answered 307 to the sign-in page.
**Why.** The path was absent from the proxy public list, so the session check redirected it like any protected route.
**Impact.** No crawl directive on any workspace host. The meta instruction still prevented indexing of rendered pages, but responses that render no HTML carried nothing.
**Fix.** Three layers: the robots file served with a full disallow and reachable without a session, a noindex response header on every path, and the existing meta tag left in place.
**Proof.** Verified against a production build. Three regression tests.

### S2-3 — Production security policy permitted code evaluation

**What.** The script source directive in `portal/next.config.ts`.
**Why.** Present for React Refresh, which runs only in development. A default nobody revisited.
**Impact.** Permitted evaluation of strings as code on the origin holding every customer record.
**Fix.** Scoped to development, matching how the development websocket beside it was already handled.
**Proof.** The production build serves the header without it, and the sign-up page was driven in a browser until every password rule flipped as characters were typed, proving hydration and reactivity survive the change.

### S3-1 — Deleting a person was impossible

Nine foreign keys referenced the profile table with no delete rule, which means refusal. The migration is written and not yet applied. Related and more serious: the audit trail already discarded the actor on deletion, so removing somebody silently erased who performed every action they had ever taken. The identity is now captured when each line is written.

### S4-1 — Open

A photograph is committed at 1.77 megabytes as the fallback inside a picture element whose primary source is 49 kilobytes, so almost nobody fetches it. No image tool is available in this environment to recompress it. Left accurately described rather than falsely closed.

## 4. Corrected false positives

Two items the first automated sweep raised were errors in the check, not the site, and are recorded because a check that cries wolf gets ignored.

A page was flagged for appearing in the sitemap on the assumption its filename meant a status page. It is a service page selling maintenance and support, and it belongs there. A photograph was flagged on raw file size without asking whether it is ever served. Two contrast readings were wrong because the script could not composite: gradient text sets its colour to transparent and paints through the background, and a chip on a ten-percent tint over near-black resolves to roughly 6.4 to 1 rather than the 1 to 1 a naive reading gives.

## 5. Test harness

The suite was reporting a different failure on each run, which reads as unreliable and teaches people to ignore a red result. Three causes, all fixed. A check waited for fonts, images and an analytics beacon in order to assert two attributes present in the markup. Parallel workers competed with the development server compiling routes on demand, so pages answering in 0.22 seconds exceeded a sixty-second budget. The timeout was measuring machine speed rather than correctness. Retries remain at zero deliberately, because a retry would have concealed this instead of prompting a fix.

One further failure was the auditor's own doing. The enquiry test posts to an endpoint permitting five submissions per minute per address. One run posts twice, but the suite had been run five times in twenty minutes. That is the protection working, and it is now documented in the test.

132 browser checks pass across two consecutive clean runs.

## 6. Open items requiring the founder

1. **Reconnect the Supabase connector.** Two migrations are written, recorded and schema-checked but unapplied. Until they are, the screens built in loop 2 fail on their first query.
2. **Deploy.** Production currently runs code from before this work. None of the fixes above are live.
3. **Entity presence.** The organisation record lists one social profile. A Google Business Profile is the single highest-value addition for a studio serving Erode and the surrounding districts, and it cannot be created from here.
4. **Published prices and founding date.** Neither appears on the site, so neither was added to the structured data. Inventing them would be worse than omitting them.
5. **Open roles.** The careers page lists five disciplines under a heading describing where help is usually needed. If any are genuinely open positions with dates, job posting markup would place them in Google Jobs. That requires confirmation, not assumption.
6. **Outstanding from loop 1.** The sender policy record still publishes nothing, and the administrator credential shared earlier in conversation remains unrotated.
