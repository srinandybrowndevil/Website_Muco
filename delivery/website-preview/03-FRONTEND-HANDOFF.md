# Station 3 — Frontend Handoff
## Website Preview experience (Frontend V1) · Loop 1

Input: `01-RND-BRIEF.md`, `02-DESIGN-SPEC.md`. Implementation is complete and in the
repository.

---

## 1. What was built

| File | Size | What it owns |
|---|---|---|
| `website-preview.js` | ~3,600 lines | The whole studio: colour engine, content engine, five templates, preview mounting, persistence, wizard, design picker, customiser, approval |
| `website-preview.css` | ~500 lines | Studio chrome only. Loaded on `/website-preview` and nowhere else |
| `website_preview.py` | ~230 lines | The page: hero, three steps, live example strip, honesty block, FAQ, schema, studio mount point |

Changes to existing files, each one line or one block:

| File | Change |
|---|---|
| `build.py` | `SHELL` gains `{head_extra}` and `{scripts}`; `render()` gains two keyword parameters defaulting to `""`; `NAV` gains **Website Preview**; `FOOTER_COLS` gains **Website preview tool** |
| `content.py` | Registers the page in `build_all()`; adds it to `SITEMAP_PAGES` at 0.9; homepage hero CTA; dedicated homepage section; pricing-page CTA; a website-only CTA in `build_service_page()` |
| `style.css` | `.nav-links` may no longer wrap, and the gap tightens between 981–1319px |
| `scripts/build-site.mjs` | Packages the two new assets |
| `scripts/dev-site.mjs` | Serves the two new assets locally |
| `tests/marketing.spec.ts` | Four studio regression tests |

## 2. Routes

One canonical URL, steps in the fragment, exactly as the design spec set out:

```
/website-preview             landing, indexable, priority 0.9
/website-preview#/create     wizard
/website-preview#/designs    five concepts
/website-preview#/preview    full preview with device switch
/website-preview#/customize  customisation studio
/website-preview#/approve    review, approval, completion
```

Navigation uses `history.pushState`, so the landing state is a clean URL rather than a
dangling `#`, and the router runs once per navigation instead of twice. `popstate` and
`hashchange` both re-enter the router, so browser back and forward work.

Guard rails: any step beyond `#/create` reached without a business name, category and
location redirects to `#/create`; `#/preview`, `#/customize` and `#/approve` reached
without a chosen template redirect to `#/designs`. A bookmarked deep link therefore
lands somewhere usable rather than on an empty studio.

## 3. The three decisions worth knowing

**Shadow DOM.** Every preview is painted into a shadow root. The site's 140 KB
stylesheet styles `h1`, `p`, `a`, `section` and `.btn`; five business websites, three
of them light-background, cannot coexist with it any other way. `iframe srcdoc` was
rejected because this site ships `frame-src 'self'` and `about:srcdoc` is a deployment
risk.

**Container queries, not media queries.** A media query inside a shadow root still
measures the browser window, so every breakpoint in all five templates is
`@container site (...)`. Changing the device frame width therefore makes the generated
site's own breakpoints fire. Measured on the Modern Business template:

| Frame | Hero columns | Service tiles | Site nav |
|---|---|---|---|
| Desktop 1280 | `583px 477px` | 3 columns | visible |
| Tablet 834 | `778px` | 2 columns | visible |
| Mobile 390 | `354px` | 1 column | hidden |

That is a real responsive test rather than a scaled photograph of a desktop page.

**Section order is data, not code.** Each template supplies its own `parts` map and a
shared `emitSections()` walks the visitor's order. This replaced a first
implementation in which every template rendered a fixed run of sections — which made
Move up and Move down change the stored order and nothing else.

## 4. Colour safety

`resolveTheme()` derives the whole palette from four inputs (template, mode, primary,
accent). Fills keep the chosen hue; any colour used as text passes through
`legibleOn()`, which walks it toward black or white until it clears 4.5:1.

Measured on Premium in light mode:

| Chosen primary | Heading colour used | Contrast |
|---|---|---|
| `#7a1fa2` (legible) | `#7a1fa2` — used as typed | 7.40:1 |
| `#fffde0` (illegible) | `#66655a` — walked down | 5.27:1 |
| `#050505` | derived | body 4.78:1 |

White-on-near-white and dark-on-near-black are unreachable by construction.

## 5. Persistence

`PreviewRepository` is the single seam. `LocalPreviewRepository` is the only
implementation; swapping in a server-backed one replaces one object and no screen
changes. There is no speculative queue, no sync layer and no mock network call.

| Key | Store | Holds |
|---|---|---|
| `muco.wp.business.v1` | local | everything the visitor typed |
| `muco.wp.selection.v1` | local | `{templateId, styleFamily}` |
| `muco.wp.custom.v1` | local | customisation **keyed by template id** |
| `muco.wp.step.v1` | local | current step |
| `muco.wp.approved.v1` | local | the approved concept |
| `muco.wp.images.v1` | session | `data:` URLs, under a 1.5 MB cap |

Images are read with `FileReader` as `data:` URLs, never `URL.createObjectURL`: this
site ships `img-src 'self' data:`, so a `blob:` URL would be blocked by the browser
and the logo would simply not appear. Over the cap they are kept for the session and
the visitor is told plainly that they will not survive a refresh.

## 6. Accessibility as built

- Errors are sentences that say what to do; none contains the word "required". A
  failed Next moves focus to the first invalid field.
- Mini previews are `inert` and `aria-hidden` — forty extra links in the tab order of
  a comparison screen would be a defect. The full preview is interactive.
- Each preview root is a labelled region naming the business and style, so a screen
  reader is told it has entered a preview rather than the site.
- The device switch is a radio group. Customisation tabs use `role="tablist"` with
  roving `tabindex`.
- The mobile control sheet is a dialog with `aria-modal`, focus moved inside, the
  preview `inert` behind it, `Escape` to close and focus returned to the opener.
- Step changes move focus to the new heading and announce through a polite live
  region.

## 7. Performance

- Both new assets load on one page only. No other page gains a byte.
- Previews are built lazily by `IntersectionObserver` as their card nears the
  viewport, not five at once on first render.
- Mini previews are clipped to a fixed frame rather than rendering full-height pages.
- Zero image bytes: placeholder panels are drawn as inline SVG over a gradient.
- No dependency, no CDN, no font beyond the three the site already self-hosts.

`website-preview.js` is about 175 KB uncompressed, which is the honest cost of five
complete website templates with their stylesheets. It is deferred and same-origin, and
it compresses well; it is listed as a known limitation rather than hidden.

## 8. Scheduling note

Everything live is scheduled through `nextFrame()`, which races
`requestAnimationFrame` against a 120 ms timer and takes whichever arrives first. Bare
`rAF` never fires in a browser that has stopped painting — a background tab, a
throttled window — and the studio would appear frozen at exactly the moment a visitor
switched away and came back. This was found in testing, not theorised.

## 9. API contract for a future backend

Nothing is implemented. When a backend arrives it should satisfy this shape, which is
what `LocalPreviewRepository` already implements:

```
saveDraft(BusinessDraft)                              -> ok
loadDraft()                                           -> BusinessDraft | null
saveSelection(TemplateSelection)                      -> ok
loadSelection()                                       -> TemplateSelection | null
saveCustomizations(Record<templateId, Customization>) -> ok
loadCustomizations()                                  -> Record<templateId, Customization>
saveApproval({templateId, business})                  -> ok
```

Errors, empty lists and offline behaviour are not specified here because no call is
made; specifying them now would be inventing a contract nobody has to honour.

---

**Station 4 (Backend): deliberately not run.** See `04-BACKEND-HANDOFF.md`.
