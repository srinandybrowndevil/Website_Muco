# Finding template

Every issue, decision, or recommendation uses these fields in order.

- A. WHAT — exact thing and where it lives (URL, screen, component, file, endpoint, job, env, process step)
- B. HOW TO SEE — steps a non-engineer can follow (device, browser, viewport, account, data)
- C. WHY — root cause, mechanism, missing invariant, bad assumption, broken process
- D. WHY NOW — why this env / browser / load / content / config / time
- E. IMPACT — user, business, SEO, legal, security, cost, brand, team speed. Severity + likelihood
- F. FIXABLE — Yes / Yes with tradeoff / Partial / No (and what No means)
- G. HOW TO FIX — concrete product, design, code, config, infra, test, or process change. Preferred + acceptable alternative
- H. PROOF — test, metric, screenshot, log, synthetic, launch check
- I. PREVENT — test, alert, token, ADR, review rule, runbook
- J. WHO — owner role and follow-up role

## Taxonomy

- Severity — S0 blocker / S1 critical / S2 major / S3 minor / S4 polish
- Likelihood — always / common / rare / environmental
- Layer — product, design, content, frontend, backend, mobile, data, ml, infra, pipeline, third-party, process, docs, support, growth, commerce
- Type — bug, defect, vulnerability, regression, a11y, perf, reliability, cost, DX, docs, process, positioning
- Root class — wrong problem, wrong design, wrong implementation, missing test, config drift, dependency, incentive / process
- Fix class — copy, one-line, localized refactor, architectural, infra, organizational, cannot fix in software alone

Do not inflate severity. Do not bury an S0.
