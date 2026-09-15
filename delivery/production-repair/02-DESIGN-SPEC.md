# Production repair — design

## Customer

Add `/start-project` to the customer navigation and overview, including the no-project state. Public Start a project, customer signup and sales-contact links preserve this destination through authentication. Retain `/support` for existing support requests.

The new page presents a project brief: service, short title, business need, optional requirements, indicative budget, desired timeline, current website, reference links and contact preference. These are existing database fields. Use a single-column form on mobile and existing panels/type/tokens, without new dependencies or animations. Explain that the submission requests a discussion, not an order or fixed quote.

Show actual saved requests and statuses beside/below the form. Loading is supplied by existing route boundaries; missing customer linkage, database failure and empty lists have distinct explanations. Successful submissions include a reference and a route to request history. Disable submissions while saving; retain input on failure and allow retry. Fields have explicit labels and length limits.

## Admin

Pipeline rows open `/pipeline/[id]`. Use native labelled stage and date inputs, a non-negative INR estimate and an explicit Save button. Show the original enquiry/request link when available. A missing lead is a 404; a database error is an alert. Navigation and statuses work without dragging.

Paginate pipeline records with explicit page-scoped metrics and total record count. Show real errors instead of an empty state. Conversion and request-status controls preserve retry actions after failure, announce errors and refresh only after a confirmed write.

## Hosting

Each workspace has its own root/build and hostname; the public static site retains its own Vercel project. Repair the existing project only after its assigned domains are verified. Keep authentication checks enabled for every production build.
