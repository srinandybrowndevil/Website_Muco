# E-commerce roles (all master-level)

Use for D2C stores, marketplaces, B2B catalogs, booking-with-pay, and any product that takes money for goods or services. Also load website roles. Load app roles if there is a shop app.

## Leadership and delivery

Standard company set plus Head of Commerce lens — conversion, AOV, margin, stock-out, refunds, chargebacks as product requirements not afterthoughts.

## Product, research, growth

- Commerce PM — catalog, cart, checkout, post-purchase, return
- Merchandising PM — collections, badges, urgency without lying
- Marketplace PM — seller onboarding, commissions, disputes (if marketplace)
- Growth / CRO — experiment design that does not break checkout
- SEO — product/category intent, faceted-nav crawl traps, canonical hygiene
- Email / SMS / WhatsApp commerce — abandoned cart, back-in-stock, consent
- Loyalty / promotions PM — coupon stacking rules that finance can explain
- Analytics — product-level funnel, payment-method funnel, refund cohort

## Design and content

- Product / UX / UI / brand / motion / UX writing / a11y
- Conversion designer — PDP, cart drawer vs page, checkout steps
- Catalog content designer — image quality rules, swatches, size guides
- Photographer / media spec owner — required angles, alt text, video
- Offer / legal copy — MRP, tax-inclusive language, shipping promise that is true

## Engineering

- Commerce architect — catalog, price, cart, order, payment, fulfillment domains
- Catalog / PIM engineer — variants, attributes, bundles, channel feeds
- Search and merchandising engineer — relevance, boosts, zero-result recovery
- Pricing / promo engine engineer — stacking, currency, B2B price lists
- Cart and checkout engineer — guest vs account, address, shipping quotes
- Payments engineer — idempotent capture, 3DS, wallet, COD, failed-retry, reconcile
- Tax / invoice engineer — GST/VAT, e-invoice where required, credit notes
- Inventory engineer — reservation, oversell guard, multi-warehouse
- Order-management engineer — states, split shipment, edit, cancel
- Fulfillment / WMS integration
- Returns / RMA engineer
- Subscription / preorder engineer when those exist
- Marketplace seller-portal engineer when those exist
- Feed engineer — Google Shopping, Meta, affiliates
- Fraud engineer — velocity, device, block/allow, review queue
- Notification engineer — order, ship, delay, NDR

## Data

- Commerce data engineer — orders as source of truth
- Analytics engineer — net revenue definitions (gross vs returns vs discounts)
- Finance-systems integration — settlement files vs orders

## Cloud, ops, storefront ops

- DevOps / SRE — checkout SLO tighter than brochure pages
- Release manager — never freeze mid-sale without a plan
- CMS / storefront ops — campaign landing pages that do not break templates
- Edge / CDN — flash-sale cache rules so price/stock is not stale

## Quality, money-safety, compliance

- QA — catalog, cart math, coupon math, tax math, refund math
- Payments QA — success, fail, pending, double-click, back button, webhook late
- Performance — PDP and checkout under sale traffic
- AppSec — payment page integrity, admin IDOR, coupon abuse, PII
- Privacy — customer data, address book, saved cards (token only)
- Accessibility — checkout is not exempt from WCAG
- Compliance — PCI scope awareness, consumer-law copy, country-specific invoice
- Ops QA — warehouse scan path, NDR, reverse logistics

## Customer and operations

- Support / CX — order status a human can explain
- Customer success for B2B
- Vendor / seller success for marketplaces
- Store operations / merchandiser
- Logistics coordinator lens — SLA vs promise on PDP

## Commerce-specific non-negotiables

- Price at PDP equals price at pay
- Stock cannot sell twice
- Pay webhook can arrive twice and must not double-charge or double-fulfill
- Failed pay must not look like success
- Tax and shipping visible before pay
- Refund path exists and is tested
- Admin cannot silently mutate paid orders without an audit row
- Sale-day load plan
