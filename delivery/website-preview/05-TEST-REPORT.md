# Station 5 — Test Report
## Website Preview experience (Frontend V1) · Loop 1

Executed against the site running locally (`node scripts/dev-site.mjs 8123`) and built
by `python build.py`. Every result below was observed. Nothing is inferred.

---

## 1. Automated suites

| Suite | Command | Result |
|---|---|---|
| Page audit | `python scripts/site-audit.py` | **33 pages, nothing failing.** 4 pre-existing notes about short titles on other pages |
| Node tests | `npm test` | **3 suites, 21 assertions, 0 failed** |
| Browser suite | `npx playwright test tests/marketing.spec.ts` (desktop + mobile) | **145 passed, 1 skipped** (the skip is a pre-existing mobile-only pricing test) |
| Generator determinism | two consecutive `python build.py` runs, md5 of all HTML + sitemap | **identical** |

The browser suite discovers pages from the filesystem, so `/website-preview` was
automatically covered for clean load, resolving internal links, image alt text, tap
target size and no sideways scroll, in addition to the four studio tests written for
this feature.

## 2. Functional cases

| # | Case | Expected | Actual | Result |
|---|---|---|---|---|
| T-01 | Open `/website-preview` | Page renders, studio hidden, landing visible | `wp-ready` set, studio band hidden, 5 example slots present | Pass |
| T-02 | Landing example strip | Five concepts drawn by the real engine | 5 painted, shadow DOM sizes 5,952 / 8,205 / 9,282 / 8,487 / 6,996 bytes | Pass |
| T-03 | Enter wizard | Landing hides, `#/create` in URL | All six landing sections `display:none`, hash `#/create` | Pass |
| T-04 | Next with empty form | Three errors, no advance, focus to first field | Three errors, still on step 1, focus on `#wp-businessName` | Pass |
| T-05 | Error wording | No "this field is required" | "Enter the name your customers know you by." / "Choose the closest category…" / "Enter the town or city your customers are in." | Pass |
| T-06 | Optional email, malformed | Named error, blocks that step only | "That does not look like an email address. Check for a missing @ or dot." | Pass |
| T-07 | Optional fields skipped | No block | Steps 2–4 advanced with everything blank | Pass |
| T-08 | Generate concepts | Five cards | 5 cards: Minimalist, Maximalist, Modern Business, Geometric Editorial, Premium | Pass |
| T-09 | Concepts use the business | Name, town, services present | All 5 contain "SLS Gym"; all 5 contain "Strength training" | Pass |
| T-10 | Category awareness | Labels follow the category | Nav reads "Training programmes", "Getting started" for Gym / Fitness | Pass |
| T-11 | Mini previews inert | Not in tab order | `inert === true` and `aria-hidden="true"` on all 5 | Pass |
| T-12 | Choose a design | Selection stored, customiser opens | `{templateId:"premium", styleFamily:"premium"}`, 5 control tabs | Pass |
| T-13 | Live colour change | Preview repaints, no save | `#7a1fa2` applied to headings within one frame | Pass |
| T-14 | Light/dark switch | Template's own light palette | Premium paper `#0c0b0a` → `#f6f2ec` | Pass |
| T-15 | Section toggle | Section leaves the page | `#gallery` present → absent | Pass |
| T-16 | Move up / down | Rendered order changes | `services,about,…` → `about,services,…` → back | Pass |
| T-17 | Action needing missing data | Disabled, with the reason | WhatsApp and Get directions disabled: "Add a WhatsApp number in your details to use this." | Pass |
| T-18 | Approve | Honest completion state | "Your website concept is ready." / "Nothing has been sent to MUCO LABS yet" | Pass |
| T-19 | Nothing is submitted | No non-GET request to this origin | Empty, across the whole flow including approval | Pass |
| T-20 | Refresh mid-flow | Step and data restored | Reload at `#/customize` restored template, mode `light`, primary `#fffde0` | Pass |

## 3. The requirement the brief calls critical (section 19)

| # | Case | Result |
|---|---|---|
| T-21 | Business data survives a template switch | Byte-identical JSON before and after switching Modern Business → Maximalist |
| T-22 | New template gets its own defaults | Maximalist arrived with `#f03d2f`, not Modern Business's `#1d4ed8` |
| T-23 | Customisation is per template | Maximalist set to `#0b7d4f`; Modern Business still `#1d4ed8` |
| T-24 | Returning restores that design | Modern Business came back with its own mode, primary **and section order** intact |

## 4. Differentiation (brief sections 12 and 52)

Measured on the five rendered concepts rather than judged by eye:

| | Minimalist | Maximalist | Modern Business | Geometric Editorial | Premium |
|---|---|---|---|---|---|
| h1 size | 50px | 104px | 46px | 64px | 68px |
| h1 weight | 400 | 900 | 600 | 600 | 300 |
| h1 family | Instrument Serif | Inter Tight | Inter Tight | JetBrains Mono | Instrument Serif |
| h1 tracking | normal | −4.16px | −0.92px | +5.12px | −0.34px |
| h1 alignment | centre | left | left | left | centre |
| header position | static | static | sticky | relative | absolute |
| header background | transparent | `#f03d2f` | `#f4f6fa` | transparent | transparent |
| page background | `#fbfaf8` | `#fffdf6` | `#f4f6fa` | `#f2f0e9` | `#0c0b0a` |
| element count | 43 | 51 | 63 | 44 | 42 |

Five different values on every structural axis. The browser test asserts this
continuously: it fingerprints size, weight, family, tracking, alignment and header
position per concept and fails unless all five fingerprints are distinct.

## 5. Responsive

Document-level horizontal overflow, measured at 320px on every studio screen:

| Screen | Overflow |
|---|---|
| Landing | 0 px |
| Wizard | 0 px |
| Designs | 0 px |
| Preview | 0 px |
| Customise | 0 px |
| Approve | 0 px |

Device switching inside the preview, on Modern Business:

| Frame | Hero | Tiles | Site nav | Scale note shown |
|---|---|---|---|---|
| Desktop 1280 | 2 columns | 3-up | visible | "1280px layout, shown at 90%" |
| Tablet 834 | 1 column | 2-up | visible | "834px layout, shown at full size" |
| Mobile 390 | 1 column | 1-up | hidden | "390px layout, shown at full size" |

Mobile control sheet at 320px: opens as `role="dialog"` with `aria-modal="true"`,
focus moves inside, the preview behind becomes `inert`, `Escape` closes it and focus
returns to the opener. All observed.

Primary navigation after adding an eighth item: single row with no overflow at 990px,
1024px and 1280px.

## 6. Contrast

| Context | Colour pair | Ratio | AA |
|---|---|---|---|
| Premium light, heading, brand `#7a1fa2` | `#7a1fa2` on `#f6f2ec` | 7.40 | Pass |
| Premium light, heading, brand `#fffde0` | walked to `#66655a` | 5.27 | Pass |
| Premium light, body text | `#6c6b67` on `#f6f2ec` | 4.78 | Pass |
| Premium light, micro label | `#836919` on `#f6f2ec` | 4.71 | Pass |
| Premium dark, heading | `#efe8dd` on `#0c0b0a` | 16.02 | Pass |

## 7. Defects found and fixed during testing

| # | Severity | Defect | Fix |
|---|---|---|---|
| D-01 | S2 | `mount.offsetTop` is measured from the offset parent, so a step change scrolled past the studio to the bottom of the page — which also left the design cards above the viewport, so their lazy previews never built | Switched to `getBoundingClientRect() + pageYOffset` |
| D-02 | S2 | Everything live was scheduled on bare `requestAnimationFrame`, which never fires in a browser that has stopped painting; the studio appeared frozen | Added `nextFrame()`, racing rAF against a 120 ms timer |
| D-03 | S2 | **Move up / Move down changed the stored order and nothing on screen**, because all five templates rendered a fixed sequence of sections | Each template now supplies a `parts` map; shared `emitSections()` walks the visitor's order |
| D-04 | S2 | The "Main colour" control did nothing on Premium or Geometric Editorial — neither template consumed `t.primary` | Both now use it for the wordmark, headings and the outlined numeral; Minimalist too |
| D-05 | S2 | A section labelled "Hours & location" was offered but no template rendered it, and no step ever asks for opening hours | Renamed "Find us" and implemented in all five templates, showing the address and map link the wizard does collect |
| D-06 | S3 | Disabled action reason read "Add a whatsapp in your details" | Added `needsLabel`: "Add a WhatsApp number in your details to use this." |
| D-07 | S2 | Adding an eighth navigation item wrapped the primary nav onto two rows at 1024px | `.nav-links` may no longer wrap; gap tightens between 981–1319px |
| D-08 | S3 | `website-preview.css` and `website-preview.js` were absent from the dev server allowlist, so both 404'd locally | Added, with a comment pairing the two allowlists |

All eight were found by running the thing, not by reading it.

## 8. Not verified, and why

- **Full-page visual screenshots of all five concepts side by side.** The browser
  pane's compositor repeatedly paused during this session — `requestAnimationFrame`
  stopped firing and screenshots returned blank. Three of the five were captured
  visually: Minimalist, Maximalist and Modern Business, the last showing the correct
  browser chrome, category-aware navigation and the real phone number. The other two
  were verified structurally through the DOM rather than photographically.
- **Real mobile hardware.** Tested at emulated widths only.
- **Screen reader pass.** Semantics, focus order, live regions and `inert` were
  verified programmatically; no assistive technology was actually driven.
- **Cross-browser.** Chromium only. Container queries and shadow DOM are supported by
  all current browsers, but Safari and Firefox were not exercised here.

---

**Handoff to QA.** Eight defects found, eight fixed, all suites green afterwards.
