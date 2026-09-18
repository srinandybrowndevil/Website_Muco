# Master Report
## MUCO LABS — Website Preview experience, Frontend V1

**Product type:** Website feature · **Loop:** 1 · **Gate result:** Pass with a punch list
**Scope:** Frontend only. No backend, no database, no AI, no third-party API.

---

## Completed

A visitor to mucolabs.com can now enter five facts about their business and watch it
appear inside five genuinely different website designs, choose one, change its
colours, typeface, sections and main action, see it at desktop, tablet and phone
width, and keep the result as the starting point for a real project.

- Landing page at `/website-preview`, indexable, with a live example strip that draws
  all five concepts in the browser rather than showing screenshots
- Five-step business wizard with three required fields and everything else optional
- Five design directions that differ in structure, not palette
- Full-size preview with a working device switch
- Customisation studio: brand colours, five type sets, hero copy, section visibility
  and order, and the primary action
- Approval screen that states plainly that nothing has been sent
- Progress survives a refresh; nothing leaves the browser

## MUCO LABS integration

| Surface | What was added |
|---|---|
| Navigation | **Website Preview**, placed between Work and Pricing — after the proof, before the price |
| Homepage hero | **Preview Your Website** as the secondary action, beside Start a Project |
| Homepage section | "See your business online before you build", with the five directions named |
| Website development page | "Not sure what your website should look like?" with **Generate My Website Preview** |
| Pricing page | "Want to see the design first?" with **Preview My Website** |
| Footer | **Website preview tool** under Explore |

The studio uses the site's own tokens, buttons, spacing and type scale. No new colour
was introduced.

## Website Preview flow

**Business details → five concepts → full preview → choose → customise → approve.**
The structure the brief specified, unchanged.

## Key files changed

| New | |
|---|---|
| `website_preview.py` | The page |
| `website-preview.js` | The studio and the five templates |
| `website-preview.css` | Studio chrome, loaded on this page only |
| `delivery/website-preview/*.md` | Seven station documents |

| Modified | Change |
|---|---|
| `build.py` | Two optional `render()` parameters; nav and footer entries |
| `content.py` | Page registration, sitemap entry, four entry points |
| `style.css` | Primary nav may no longer wrap |
| `scripts/build-site.mjs`, `scripts/dev-site.mjs` | Package and serve the two new assets |
| `tests/marketing.spec.ts` | Four studio regression tests |

## Local state

**Persisted (localStorage):** business details, chosen template, customisation per
template, current step, approved concept.
**Persisted for the session only (sessionStorage, 1.5 MB cap):** uploaded logo and
images, as `data:` URLs.
**Not persisted:** anything server-side. Nothing is uploaded, sent or stored outside
the visitor's browser.

## Testing performed

| | |
|---|---|
| Page audit | 33 pages, nothing failing |
| Node tests | 21 assertions, 0 failed |
| Browser tests | 145 passed, 1 skipped, desktop and mobile |
| Generator | Deterministic across two runs |
| Manual flow | All 24 steps of the brief's acceptance test |
| Responsive | 0 px horizontal overflow at 320 px on all six screens |
| Contrast | Measured; worst case 4.71:1, all AA |

Eight defects were found by running it and all eight were fixed — including three that
mattered: Move up/down changed stored state but nothing on screen, the main colour
control did nothing on two of the five designs, and the new navigation item wrapped
the header onto two rows at 1024px.

## Known frontend limitations

1. Five type sets are built from three self-hosted families plus system stacks,
   because the site's own policy permits no third-party fonts. No rounded face.
2. `website-preview.js` is about 175 KB uncompressed. Deferred, one page only.
3. No Stats section — we hold no true numbers, and inventing them is forbidden.
4. Images over 1.5 MB are kept for the session only; the visitor is told.
5. Accessibility verified by measurement, not with a screen reader.
6. Chromium only.

## Ready for next phase

The seam is `PreviewRepository` — seven methods, one local implementation. A server
implementation replaces one object and no screen changes. Before that phase begins,
two things need deciding rather than assuming: what identity a saved draft belongs to,
and whether approval should notify MUCO LABS — because if it should, the copy that
currently says nothing was sent has to change with it.
