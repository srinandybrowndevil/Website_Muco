# Design station

Design receives R&D, not a raw slogan. Design outputs a spec Frontend can implement without guessing.

## Required sections in 02-DESIGN-SPEC.md

1. Design thesis — how the product should feel, in professional English.
2. Sitemap / app map.
3. User flows — first visit, convert, fail, return, recover.
4. Page or screen specs. For every page:
   - Purpose
   - Layout zones
   - Exact UI components
   - Copy direction (final copy if known; otherwise labeled placeholder copy)
   - Placeholder inventory — search fields, form inputs, empty tables, image slots, skeleton loaders
   - States — default, hover, focus, active, disabled, loading, success, error, empty, offline, permission denied
   - Validation messages
   - Primary and secondary CTAs
   - Growth slots — title pattern, H1, FAQ / Q&A block, internal links, schema hook
5. Component system — buttons, inputs, cards, nav, tables, toasts, modals. One source, no one-off twins.
6. Type, color, space, elevation, dark mode if claimed.
7. Motion — duration, easing, reduced-motion fallback.
8. Accessibility — focus order, target size, contrast, names.
9. Responsive rules — 320 through 1920.
10. Content rules — what is never lorem in production.
11. Assets — logo use, image ratios, icon style.
12. What Frontend must not invent.

## Placeholders

Every input has label, placeholder, helper, error. Every list has empty. Every image has alt rule. Every async region has loading. Mark placeholders that must be replaced before launch.

## Commerce extras

PDP, PLP, collection, cart, checkout, order tracking, return request — each as a full screen spec. Price and stock must have true-state designs, not happy-path only.

## App extras

Splash, permission, first-open, push landing, offline, upgrade. Platform conventions honored (HIG vs Material) unless R&D overrode with a reason.
