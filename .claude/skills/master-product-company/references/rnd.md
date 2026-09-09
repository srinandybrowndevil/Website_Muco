# R&D station

R&D is not brainstorming. It is a structured intelligence pack the rest of the company can build from.

## Always do

1. Restate the idea in one professional paragraph.
2. Name the product type and every extra surface.
3. Name the primary user, job-to-be-done, and the first success moment.
4. Map competitors and substitutes. Facts vs assumptions labeled.
5. Map market constraints for the stated geography (example — India GST for commerce). Do not invent statutes. Flag what must be verified by counsel.
6. Write the domain objects and business rules.
7. Write the page/screen inventory at outline level.
8. Write the intent map for organic demand — seed queries, answer-engine questions, generative-engine prompts, social/search ad angles. This is how organic leads are designed in.
9. List risks, unknowns, and the cheapest test for each unknown.
10. List what Design must solve vs what Engineering must solve vs what Marketing must solve.

## If the product is a website

Gather positioning, sitemap outline, content types, crawl targets, brand voice, conversion actions, and measurement.

## If the product is an e-commerce platform

Gather the full commerce detail before Design:

- Catalog model — products, variants, bundles, digital vs physical
- Pricing — MRP, sale, B2B lists, coupons, stacking
- Tax — GST/VAT treatment as a rule set, not a guess
- Cart and checkout steps
- Payments — cards, UPI, wallets, COD, international if claimed
- Inventory — single warehouse vs multi, oversell policy
- Fulfillment — shipping rules, SLA copy that must stay true
- Returns / refunds / cancellations
- Marketplace vs single-seller
- Legal copy that pages must not contradict
- Peak-load hypothesis for sale days
- Feed destinations (Shopping, Meta) if growth requires them

## If the product is an app

Gather platform list, offline rules, push policy, permission justification, store positioning, IAP vs web pay, deep-link map, device matrix.

## If the product is other software

Gather tenancy, roles/permissions, public contracts, SLOs vs sales promise, integrations, data retention, admin vs end-user surfaces.

## Loop 2+ extra

Start from `07-RND-RETURN.md`. For each open finding, state whether the brief was wrong, the design was wrong, or the implementation was wrong. Patch the brief first.

## Output shape for 01-RND-BRIEF.md

- Executive thesis
- Users and jobs
- Scope in / scope out
- Domain and rules
- Screen/page outline
- Growth intent map (SEO, AEO, AIO, GEO, SEM, SMM)
- Design instructions
- Engineering instructions
- Open questions
- Assumption log
