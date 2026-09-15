# Station 2 — Design Specification (Loop 3)

**Date:** 15 September 2026
**Product:** MUCO LABS public website

## Information architecture

- Single primary conversion path: visitor → Start a Project CTA → `/contact` → `api/lead.js` → email to MUCO LABS.
- Header navigation: Services, Work, Pricing, About, Learning / Courses, FAQ, Contact, Start a Project.
- Footer navigation: grouped by Services, Company, Legal and Learning; no portal links.
- All public routes keep existing SEO metadata (title, description, canonical, Open Graph, schema).

## Conversion design

- The previous `Sign in` header and mobile actions become `Start a Project` buttons using the existing `btn btn-primary` style.
- The `/contact` form remains the main enquiry capture. It requires name, business, phone, service and consent, with email and optional fields.
- The `/learning` page removes the separate learning portal CTA and points learners to `/contact` for questions.

## Responsive and accessibility requirements

- Existing responsive breakpoints and touch targets are unchanged.
- Forms keep visible labels, error messages and focus states.
- No hover-only interactions. Mobile menu retains keyboard trap and Escape behaviour.

## Visual constraint

Re-use the existing dark palette, typography and button primitives. The Start a Project CTA uses the existing primary button style.
