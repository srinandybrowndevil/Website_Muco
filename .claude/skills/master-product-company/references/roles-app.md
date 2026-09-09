# App development roles (all master-level)

Use for native iOS, native Android, Flutter, React Native, Kotlin Multiplatform, and serious PWAs. Website roles still apply when there is a companion site or webview.

## Leadership and delivery

Same master set as a software company — CEO lens, CTO, VP Eng, VP Product, EM, project, program, scrum, release — plus App Release Manager who owns store review windows, phased rollout, and halt-the-rollout.

## Product, research, growth

- Product Manager / Product Owner / BA / Researcher — same bar as web, plus store-listing promise vs in-app reality
- Growth / ASO specialist — title, subtitle, screenshots, ratings response, localized listing
- Lifecycle / CRM — push, in-app, email permission state machine
- Analytics — first-open, activation, retention D1/D7/D30, crash-free sessions

## Design and brand

- Product / UX / UI / visual / motion / UX writing / a11y design
- Platform designer — iOS HIG vs Material vs OEM skins; do not ship iOS patterns on Android or the reverse without a reason
- Icon and store-art designer — adaptive icon, notification icon, splash, screenshot narrative
- Prototype / interaction designer — gestures, haptics, shared-element motion

## Engineering

- Mobile architect — module boundaries, offline-first vs cache, navigation graph
- iOS engineer — lifecycle, Combine/structured concurrency, App Intents, privacy manifests, bitcode-free modern toolchains
- Android engineer — activity/fragment/compose lifecycle, background limits, Play integrity, per-app language
- Cross-platform engineer — Flutter / RN / KMP. Own the escape hatch to native. Do not pretend one codebase erases platform work.
- Mobile backend engineer — device-aware APIs, fan-out, payload size, token rotation
- Offline / sync engineer — conflict rules, queue, clock skew, storage budget
- Push / notification engineer — permission UX, channels, collapse keys, quiet hours, deep-link routing
- Identity engineer — biometric, secure storage, session restore, account-switch
- Payments-in-app engineer — store IAP vs web payment rules, restore purchases, receipt validation
- Deep-link / attribution engineer — universal links, app links, deferred install
- Device-features engineer — camera, files, location, bluetooth, sensors — permission before access
- Wear / widget / extension engineer when those surfaces exist
- QA-facing build engineer — dev / staging / prod flavors, hidden debug, no prod secrets in debug menus

## Data and ML on device

- Mobile analytics engineer — offline event queue
- On-device ML engineer — model size, battery, fallback
- Mobile DBA — encrypted-at-rest local DB, migration on upgrade

## Cloud, DevOps, release

- Mobile DevOps — Fastlane / similar, signing, provisioning, mapping files
- CI for apps — PR checks on both OS when both exist
- Release engineer — version/build numbers, changelog, phased rollout, freeze
- SRE for mobile backends — same as software SRE plus crash pipeline (Crashlytics / Sentry class)
- Feature-flag engineer — kill switch that does not require a store review

## Quality and safety

- Mobile QA — real device matrix, not emulator-only
- SDET — gray-box UI tests plus unit plus screenshot tests where they pay rent
- Exploratory tester — permissions denied, mid-flow phone call, dead battery saver, RTL, font scale 200%, talkback/voiceover
- Performance engineer — cold start, frame drops, memory jetsam, battery, network radio
- AppSec — tapjacking, backup extraction, insecure storage, deep-link injection, certificate pinning policy
- Privacy engineer — ATT / Play data safety form that matches reality
- Accessibility engineer — VoiceOver / TalkBack, Dynamic Type / font scale, touch targets
- Store-compliance tester — IAP rules, restricted content, background location justification

## Customer

- Technical writer — in-app help, store What's New that is true
- Support engineer — device + OS + app version + build in every ticket path
- Implementation / CSM — MDM / enterprise install when relevant
- Community / ratings ops — review response without fake-review tactics

## App-specific non-negotiables

- Install, first-open, permission, login, offline, background, kill, upgrade, rollback
- Push that opens the right screen
- Tablet / foldable / landscape if claimed
- App size budget and first-frame
- Store listing vs binary version mismatch
- Dev / staging / prod bundle IDs and signing drift
