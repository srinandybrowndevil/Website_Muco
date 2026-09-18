# Website Preview V2 — Gemini Personalisation
## Implementation report

**Scope:** an upgrade to V1, not a rebuild. V1's routes, wizard, five template
families, renderer, customiser, persistence and approval flow are unchanged
except where V2 adds to them.

---

## V1 baseline verified

Confirmed running before anything was modified:

| Check | Result |
|---|---|
| `python build.py` | Clean, 39 files, deterministic across two runs |
| `python scripts/site-audit.py` | 33 pages, nothing failing |
| `npm test` | 3 files, 0 failed |
| `npx playwright test tests/marketing.spec.ts` | 145 passed, 1 pre-existing skip |
| `/website-preview` flow | Wizard, five concepts, preview, device switch, customise, approve — all working |

## V2 completed

- One server-side personalisation request per generation, to our own endpoint
- Structured, schema-validated copy and design direction from Gemini
- One result personalises all five families; none of them collapse into one look
- A recommended design, marked, with all five still choosable
- Per-concept explanation on each card, written for that design
- Regenerate content, as an explicit action
- Four headline rewrites in the customiser
- A deterministic fallback that makes Gemini optional in the strict sense

## Architecture

```
Wizard  →  POST /api/preview  →  Gemini REST (responseSchema)
                ↓
        validate field by field
                ↓
        muco.wp.ai.v1 in localStorage
                ↓
   derive() + defaultCustomization()      ← user data still outranks it
                ↓
        the five V1 templates             ← still the only thing that renders
```

Gemini returns copy and a colour direction. It never returns markup, and no AI
output is ever rendered as HTML.

### Two decisions that differ from the V2 prompt

**No `@google/genai` SDK.** The prompt names it. This repository installs
nothing — `vercel.json` sets `installCommand` to `""` — and `api/lead.js`
already calls Resend, another third-party API behind a secret, with plain
`fetch`. Gemini's REST endpoint supports `responseSchema`, so structured output
costs no dependency, no bundling into the function and no supply-chain surface.
Agreed with the owner before implementation.

**One file, not `lib/ai/*`.** The prompt suggests four modules. With no install
and no build step, a function that imports nothing cannot fail to deploy, which
is why `api/lead.js` is self-contained too. `api/preview.js` is sectioned
instead. The prompt allows "or equivalent based on the existing codebase".

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | No | Server only. Without it the endpoint answers `fallback` |
| `GEMINI_MODEL` | No | Defaults to a Flash-class model; centralised in one constant |
| `GEMINI_TIMEOUT_MS` | No | Clamped to 1000–60000, default 15000 |

Documented in `.env.example` and in the generated `README.md`. `.gitignore`
already excludes `.env` and `.env.*` while tracking `.env.example`.

## Security verification

| Requirement | How it was verified | Result |
|---|---|---|
| Key exists only server-side | `grep` for `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `generativelanguage` across every `.js`, `.css`, `.html`, `.mjs` | One match: `api/preview.js` |
| No `NEXT_PUBLIC_GEMINI_API_KEY` | Same search | None |
| Key not in the URL | Test asserts the request URL contains neither the key nor `key=` | Pass — sent as `x-goog-api-key` |
| Key not in browser storage | Only the validated payload is stored, under `muco.wp.ai.v1` | Pass |
| Contact details not sent | Test asserts phone, WhatsApp, email, address and map URL never appear in the request body | Pass |
| Input validated | Lengths capped, arrays capped at 20, enums checked, colour format checked | Pass |
| Output validated | Rebuilt field by field; unknown template, typeface, action or section dropped | Pass |
| Output sanitised | Tags, angle brackets, entities, URLs and control characters stripped | Pass |
| No raw AI HTML rendered | Gemini returns text fields only; templates render them through the existing escaper | Pass |
| Rate limiting | 8 per minute per address, same mechanism as `api/lead.js` | Pass |
| Timeout | `AbortController`, configurable, falls back cleanly | Pass |
| Prompt injection | System instruction declares the fields untrusted; they are fenced as data | Pass |
| Fallback works | Eleven distinct failure modes tested | Pass |

## Tests performed

**`test-preview-api.mjs` — 22 cases, all passing.** A `fetch` stub is a complete
double here because there is no SDK, so every path runs in CI with no key:

valid response · key as a header · contact details withheld · no key · rejected
key · rate limit retried once then fallback · a 400 not retried · timeout ·
network failure · prose instead of JSON · invalid inner JSON · no candidate ·
safety block · schema ignored · markup, scripts and links stripped · invented
vocabulary dropped · visitor colour outranks the model · prompt injection carried
as data · oversized input capped · burst throttled · rewrite sanitised · unknown
rewrite task refused.

**`tests/marketing.spec.ts` — 152 cases, 151 passing, 1 pre-existing skip.**
Three added for V2, on desktop and mobile:

- personalised copy reaches every concept **without collapsing them**
- one design is recommended and all five remain choosable
- with no key configured the studio still produces five concepts

**Manual, in a browser:** wizard through to approval with the endpoint live and
no key (fallback notice shown, five concepts rendered); the same flow with a
validated payload seeded through storage (per-concept headlines, generated
service copy, recommended badge, positioning line).

**V1 regression:** the full 152-case suite covers navigation, the homepage CTA,
`/website-preview`, the wizard, five concepts, full preview, device controls,
choosing, customising, template switching, approval, local state and mobile
responsiveness. All still pass.

## Defects found and fixed during V2

| # | Severity | Defect | Fix |
|---|---|---|---|
| V2-01 | **S1** | **One suggested typeface was applied to all five designs, collapsing them into a single voice.** Measured: a `grotesk` suggestion put `system-ui` at weight 700 on the Minimalist, Modern Business and Editorial at once, wiping out the serif, mono and heavy display that are those families' identity | The suggestion now applies to the **recommended design only**. Colour still applies everywhere, because that is genuinely the visitor's brand and no differentiation rested on it. Guarded by a test asserting five distinct typographic fingerprints |
| V2-02 | S2 | `import preview` in `scripts/dev-site.mjs` collided with the existing `const preview` local-preview flag — a redeclaration that would have stopped the dev server booting | Renamed to `previewApi` |
| V2-03 | S3 | In credential-free local-preview mode, `/api/preview` returned the lead endpoint's 409 refusal, which reads as Gemini being broken | Returns the ordinary fallback answer, which is the path that mode should exercise anyway |
| V2-04 | S3 | A V1 test asserted that no non-GET request ever leaves the origin. V2 legitimately posts to `/api/preview`, so the assertion was now false | Rewritten to the two promises that still hold: contact details never leave, and approval submits nothing |
| V2-05 | **S1** | **The default model was retired.** `gemini-2.5-flash` returned `404 — "no longer available to new users"` on every call, so the live path never ran. Found only by making a real request; no stubbed test could have caught it | Default changed to `gemini-3.6-flash`, which Google's own error text recommends and which was then verified to work with `responseSchema`. A concrete model, not the `-latest` alias: that alias answered `503` in the same minute the pinned one answered in 3.3s, and an alias can change behaviour with no change here |
| V2-06 | S2 | **The retry stacked on top of the timeout.** Each attempt had its own 15s budget, so a bad minute could leave a visitor watching a spinner for ~31s before receiving content that was available locally the whole time | One deadline for the whole operation. The retry runs only if at least 2.5s remain, and inherits what is left rather than starting a fresh 15s |
| V2-07 | S3 | A `404` logged only as `upstream_404`, so the cause had to be found by hand. Google's message contained the entire fix | Upstream error text is now extracted and written to the server log, never returned to the browser. The `503` and `429` diagnoses that followed were both immediate because of this |

## Live verification

A key was configured after the build and the live path was exercised with
`npm run check:gemini`, which runs three real businesses and one prompt-injection
attempt through the endpoint and checks the answers by machine.

**Confirmed working.** Three separate live generations succeeded and every one
passed all checks: correct shape, five template entries, allowed vocabulary only,
five distinct headlines, and no invented customer count, rating, award, founding
year, price, guarantee or opening hours.

| Case | Result |
|---|---|
| SLS Gym | `"Build Strength and Health at SLS Gym"` — all checks passed |
| SLS Gym (second run) | `"Build Strength and Fitness in Erode"` — all checks passed |
| Prompt injection | `"Retail Store in Erode"` — a neutral headline. No instruction followed, nothing leaked, no code returned |

**Two defects found by running it, both fixed.** See V2-05 and V2-06 below.

**Observed behaviour of the account and model:**

| Fact | Measured |
|---|---|
| Latency when healthy | 3.3s |
| Latency under load | 10–13s, sometimes past the 15s timeout |
| `503` "experiencing high demand" | Frequent on `gemini-3.6-flash` and `gemini-3.7-flash` during testing |
| `429` quota | Reached after roughly a dozen calls: *"You exceeded your current quota, please check your plan and billing details"* — a free-tier limit |
| Fallback | Behaved correctly on every single failure. Five concepts rendered every time |

## Known limitations

1. **The free-tier quota is the real production constraint.** A dozen test calls
   exhausted it. With any traffic this feature will spend most of its time on the
   deterministic path unless the key is on a paid plan. That is not a fault — the
   fallback is good — but nobody should expect AI copy for every visitor on the
   current plan.
2. **The 15s timeout is tight for this model under load.** Two of the live runs
   timed out at exactly 15s. Raising `GEMINI_TIMEOUT_MS` would convert some of
   those into successes at the cost of a longer wait. It was left at 15s because
   a visitor should not watch a spinner longer than that when good content is
   already available locally.
3. **Tamil and bilingual output are specified but unverified.** The language rule
   is in the prompt and the request carries the preference; no Tamil response has
   been seen, so rendering quality at 320px with Tamil script is unknown.
4. **Rate limiting is per-instance.** Serverless means several instances, so the
   real ceiling is higher than 8 a minute. Sufficient against casual flooding;
   not a defence against a determined attacker, which would need a shared store.
5. **No cost ceiling.** One request per generation, plus explicit regenerations
   and rewrites. There is no daily cap; if this gets traffic, add one.

## Ready for V3

Not implemented, and listed only so the next phase does not have to rediscover
them:

- Image analysis of an uploaded logo to derive the palette (§23, explicitly
  optional in V2)
- A shared rate-limit store, and a spend ceiling per day
- Server-side caching of a payload by input fingerprint, so two visitors
  describing the same business do not both cost a request
- Persisting an approved concept beyond the browser, which needs the identity
  question answered first — see `04-BACKEND-HANDOFF.md`
- Streaming the copy so the first concept appears before the whole payload lands
