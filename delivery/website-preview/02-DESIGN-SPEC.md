# Station 2 — Design Specification
## Website Preview experience (Frontend V1) · Loop 1

Input: `01-RND-BRIEF.md`. Output consumed by Station 3 (Frontend).

---

## 1. Information architecture

One canonical route. The brief permits nested routes; the existing site is a flat
set of generated pages at the repository root served with `cleanUrls`, and inventing
a client-side router for six screens would be the "conflicting routing system" the
brief forbids. The chosen shape:

```
/website-preview                 the page (indexable)
/website-preview#/create         wizard
/website-preview#/designs        five concepts
/website-preview#/preview        full-size preview of one concept
/website-preview#/customize      customisation studio
/website-preview#/approve        final review and completion
```

Consequences, all deliberate:

- One URL accumulates the search authority instead of six thin ones.
- The marketing content stays in the document at every step, so a crawler that never
  runs the fragment router still reads a complete page.
- Back and forward work through `hashchange` with no server rewrites.
- Refresh restores the step from storage, satisfying brief section 30.

**Document structure**

```
main
├─ section  landing hero                                (hidden while a step is active)
├─ section  how it works — three steps                  (hidden while a step is active)
├─ section  example concepts — five live mini previews  (hidden while a step is active)
├─ section  what it is / what it is not                 (hidden while a step is active)
├─ section  FAQ — five questions, FAQPage schema        (hidden while a step is active)
├─ section  final CTA                                   (hidden while a step is active)
└─ div#wp-studio            mounted by JavaScript       (hidden until a step is active)
```

With JavaScript unavailable, `#wp-studio` holds a written explanation and a link to
`/contact`, and nothing else on the page changes. Nothing is hidden by default that
a person would need.

## 2. Studio chrome — visual language

The studio is MUCO LABS furniture and must read as part of this site, not as an
embedded third-party tool (brief section 42). It therefore uses only existing
tokens: `--bg`, `--surface`, `--surface-2`, `--surface-3`, `--line`, `--line-strong`,
`--accent`, `--radius`, `--radius-lg`, the `--sp-*` scale, the `--fs-*` scale,
`--lift`, `--shadow`, `--ease`. No new colour is introduced. Buttons reuse `.btn`,
`.btn-accent`, `.btn-secondary`, `.btn-lg`.

The one new visual idea is the **device frame**: a graphite bezel with a hairline
top light, a small dot row and a URL pill showing the business name as a slug. It is
the only decorative element and it earns its place by telling the visitor "this is a
website" faster than a caption could.

## 3. Screen specifications

### 3.1 Landing (default)

| Element | Content |
|---|---|
| Eyebrow | Website preview |
| H1 | See your business online **before you build** (last words in `.accent-serif`) |
| Lead | Enter a few details about your business and explore five different website design directions built around your brand. Nothing is sent anywhere, and no account is needed. |
| Primary | Create My Website Preview → `#/create` |
| Secondary | View Example Designs → in-page anchor to the example strip |
| Trust note | No technical knowledge required. Nothing is published, and nothing is sent. |

Then: three numbered steps; a live example strip rendering all five concepts for a
demo business through the real engine; an honesty block ("what this is / what this
is not"); five FAQs; the standard final CTA.

**States.** No loading state — the page is static HTML. The example strip renders on
first paint from a hard-coded demo record; if the engine throws, the strip removes
itself and the rest of the page is unaffected.

### 3.2 Wizard — `#/create`

Five steps, one screen each, progress rail across the top
(`1 Business · 2 Details · 3 Contact · 4 Brand · 5 Review`). Completed steps are
clickable; future steps are not. The rail is an `ol` with `aria-current="step"`.

| Step | Fields | Required |
|---|---|---|
| 1 Business | Business name, Category (14 options), City / location, Tagline | name, category, location |
| 2 Details | Short description, Services (repeatable), Products (repeatable), Address | none |
| 3 Contact | Phone, WhatsApp, Email, Instagram, Facebook, Google Maps URL | none |
| 4 Brand | Logo, Business images, Primary colour, Style mode (Light / Dark / Recommended), Language (English / Tamil / English + Tamil) | none |
| 5 Review | Read-only summary with an Edit link per group | — |

Repeatable inputs: a text field plus **Add**, producing a removable chip list. Enter
adds. Each chip's remove button is a real `button` whose accessible name includes the
value being removed.

**Validation.** Required fields validate on blur and on Next, never on keystroke.
Optional fields validate only when non-empty: email shape, phone digits (7–15 after
stripping separators), URL shape, image type in `png/jpeg/webp`, image size at most
3 MB. Errors are plain sentences under the field, wired with `aria-describedby`, and
the field gets `aria-invalid="true"`. On a failed Next, focus moves to the first
invalid field. Error text says what to do — "Enter the town or city your customers
are in", not "This field is required".

**Empty states.** Every optional block states what happens if it is left blank, for
example "No logo? The preview sets your business name in the design's own typeface."
That is what the engine actually does.

**Demo presets.** Three (SLS Gym / Erode, Sri Murugan Bakery / Coimbatore, Sathyam
Construction / Tamil Nadu) appear only when the page is opened with `?demo=1`, so
they exist for testing and never reach the customer flow (brief section 41).

### 3.3 Design selection — `#/designs`

Three columns at 1400px and above, two from 900px, one below. Each card carries:

- style name and a one-line description of the design decision it makes
- a **live mini preview** — the same engine, rendered at a 1280px logical width in a
  shadow root and scaled to fit the card, with pointer events disabled inside
- `Preview` (secondary) and `Choose This Design` (accent)

Selected state: a 2px accent border, an accent tick badge, and `aria-pressed="true"`
on the choose button. Never colour alone.

**Performance.** Five full-height websites are not rendered at once. Each mini
preview renders a header, hero, one service block, one secondary block and a CTA
footer hint, clipped to a fixed frame, and is built lazily by `IntersectionObserver`
as its card approaches the viewport (brief sections 13 and 49).

### 3.4 Full preview — `#/preview`

Top bar: back to designs · style name · device switch (Desktop 1280 / Tablet 834 /
Mobile 390) as a three-way radio group · `I Like This Design`.

The frame changes width and the site inside re-lays-out through its own container
queries. The frame scales down only when the viewport cannot show the chosen width,
and the scale factor is stated in the bar — "Shown at 62%" — so nobody mistakes a
scaled preview for the real type size.

After `I Like This Design`: an inline confirmation — "You selected the Premium
design." — offering **Customize This Design** and **Keep This Design**.

### 3.5 Customisation — `#/customize`

At 1080px and above: a 380px control rail on the left, live preview on the right,
preview sticky. Below that: preview first, controls in a bottom sheet opened by a
persistent "Customise" button. The sheet traps focus, closes on `Escape`, is marked
`aria-modal`, and makes the page behind it `inert` while open.

Control groups, as tab panels:

1. **Brand** — primary colour, accent colour, background mode (Light / Dark /
   Recommended), logo, image slot picker
2. **Type** — five type sets, shown as specimens set in the business name
3. **Hero** — headline, subheadline, CTA label, alignment (only where the template
   supports it; hidden, not disabled, where it does not)
4. **Sections** — show/hide toggles plus Move up / Move down, listing only the
   sections the category and template actually offer
5. **Action** — Call / WhatsApp / Enquire / Book / Visit Shop / Get Directions. An
   option whose data is missing is disabled with the reason beside it: "Add a phone
   number in your details to use this."

Every change repaints the preview on the next animation frame. No Save, no
Regenerate, no Reload (brief section 26). A "Reset this design" link restores the
template defaults for the active template only.

**Colour safety.** Any chosen colour passes through a relative-luminance check before
use. Foreground ink on a colour is whichever of black or white wins on contrast
ratio; a primary too light for the chosen mode is darkened for text while keeping the
chosen hue for fills. White-on-near-white and dark-on-near-black are therefore
unreachable (brief section 34).

### 3.6 Approval — `#/approve`

A summary table (business name, category, selected design, mode, primary, accent,
type set, enabled sections, primary action, language), a large final preview, and
`Approve This Website Concept`.

After approval, the completion state says exactly what happened:

> **Your website concept is ready.**
> This design is saved in this browser only. Nothing has been sent to MUCO LABS yet —
> when you are ready, start a project and we will pick it up from here.

Buttons: Back to Preview · Edit Design · Start Over · Start a Project
(→ `/contact#start-project`). "Start Over" asks for confirmation and names what it
will clear.

## 4. The five templates — composition rules

Each template is a configuration object plus a stylesheet. Shared section renderers
take a `variant` from the template. Nothing is a hardcoded page tree.

**T1 Minimalist.** Text measure 640px, blocks 960px. Centred throughout. Header:
wordmark centred, nav beneath in small tracked caps, one hairline under. Hero:
deep top padding, restrained headline, short lead, CTA as an underlined text link.
Services: numbered rows on hairlines — no boxes, no icons. Gallery: a single 3-up row
of muted squares. Footer: one centred line.

**T2 Maximalist.** Full-bleed. Header: solid primary bar, heavy caps nav, pill CTA in
accent. Hero: primary background, headline at `clamp(40px, 9cqw, 104px)` in 900 weight
at −0.04em, subheadline in a contrasting block, an infinite marquee of service names
below (stopped under `prefers-reduced-motion`). Services: giant index numerals, 3px
borders, 8px hard offset shadow, no radius. A band of oversized type showing only
labels the visitor supplied — never invented numbers. Footer: huge wordmark clipped
by the edge.

**T3 Modern Business.** Container 1160px. Header sticky and white with a shadow,
phone number as a text link plus an accent button. Hero: a 1.1fr / 0.9fr split —
copy left, a bordered "What we offer" card right listing the visitor's services.
Services: 3-up white cards with icon tiles, 14px radius, soft shadow. Then a numbered
process strip, an FAQ accordion, and a contact band with a form-shaped block that is
visual only, labelled "Enquiry form — preview only", with its inputs disabled. Two
calls to action above the fold.

**T4 Geometric Editorial.** A visible 12-column grid drawn with a repeating gradient
at low opacity. Header: logo in columns 1–3, a location and discipline line in 5–7,
nav right-aligned in 9–12, a 2px rule above and a hairline below. Hero: headline in
columns 1–7 mixing serif and mono, a large outlined numeral "01" in 9–12, caption in
mono caps. Sections alternate spans (8/4, 4/8, 12) and never repeat a rhythm twice in
a row. A pull-quote with a hanging mark. Zero radius everywhere.

**T5 Premium.** Dark by default. Header transparent over the hero: centred wordmark
in Instrument Serif with wide tracking, hairline nav in small tracked caps. Hero:
92cqh tall, centred, light-weight serif headline at `clamp(34px, 5.4cqw, 68px)`, a
1px outline CTA, a slow vignette. Sections are full-width panels on a generous
rhythm, micro-labels in wide-tracked caps, hairline rules in the accent at low
opacity. Gallery is a 2-up of tall panels. Everything breathes.

## 5. Category adaptation

Category changes, at minimum: which sections are on by default, the CTA verb, the
word for the offering, the section headings, the placeholder motif, and whether a
menu or price-list shaped block exists at all (present for Restaurant, Bakery,
Salon, Automotive; absent for Real Estate and Professional Services).

Example — same template (T5 Premium), two categories:

| | Bakery | Construction |
|---|---|---|
| Default sections | Hero, About, Products, Gallery, Hours, Contact | Hero, About, Services, Projects, Process, Contact |
| Offering noun | "our counter" | "our work" |
| CTA verb | Order Now | Request a Quote |
| Motif | soft warm arcs | hard angular strata |
| Gallery label | Fresh from the counter | Recent site work |

## 6. Accessibility rules

- Semantic elements throughout. The preview root is a labelled region naming the
  business and the style, so a screen reader is told it has entered a preview rather
  than the site.
- Focus visible everywhere: `outline: 2px solid var(--accent); outline-offset: 2px`.
  Inside a preview the ring uses the preview's own ink colour.
- The mini previews are `inert` and `aria-hidden`. They are pictures of websites, and
  putting forty extra links into the tab order of a comparison screen would be a
  defect. The full preview is interactive and is not inert.
- The device switch is a radio group, not three buttons, because it is one choice of
  three.
- Every form control has a visible label. Placeholder text is never the only label.
- Colour is never the only carrier of state.
- Contrast: studio chrome at least 4.5:1 for body text and 3:1 for large text and
  control edges. Generated previews are contrast-corrected by the colour engine.
- A step change moves focus to the new step heading and announces through a polite
  live region.

## 7. Motion

Subtle, and all of it inside `@media (prefers-reduced-motion: no-preference)`:

- step change: 180ms opacity and an 8px translate
- card selection: 140ms border and shadow
- preview repaint: no transition — an instant repaint reads as live, a fading one
  reads as loading
- device switch: 260ms width transition on the frame
- approval: one 420ms tick draw, once

No parallax, no floating elements, no 3D, no intro animation. The maximalist marquee
is the single looping animation and it stops entirely under reduced motion.

## 8. Responsive requirements

Verified at 320, 375, 390, 430, 768, 1024, 1280 and 1440. No horizontal overflow at
any of them, including inside the preview frame, which scales rather than pushing the
page sideways. Controls stay at least 44px on touch. The colour input is paired with
a text field showing the hex value, so it stays usable where the native picker is
awkward.

## 9. Error and empty states

| Situation | Behaviour |
|---|---|
| No description | Content engine composes from category, services and location |
| No services | Template renders a category-appropriate default set, visibly generic |
| No logo | Wordmark set in the template's own display face |
| No images | Generated category motif panels |
| No phone | Call and WhatsApp actions disabled with the reason stated |
| Invalid image | Named error: file type or size, with the limit |
| Refresh mid-flow | Step and data restored; images restored only if they fit the cap, otherwise a notice |
| Storage unavailable | Everything still works for the session; one notice explains progress will not survive a refresh |
| Engine throws | The step shows a plain failure message and a Start Over action. It never renders a blank screen |

## 10. Handoff to Frontend

Build in this order: colour and content engines, template configurations and
stylesheets, renderer, store and repository, studio screens, entry points, tests. Do
not begin entry points before the studio runs, and do not claim completion before the
browser flow in `05-TEST-REPORT.md` has actually been executed.

**Approved. Proceed to Station 3.**
