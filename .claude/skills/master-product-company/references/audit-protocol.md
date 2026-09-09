# Inch-by-inch audit protocol

Do not skim. Inspect surface, interaction, guts, environments, then ops.

## 0. Scope lock

- Target URLs, apps, repos, store listings
- Envs and access
- Done-means
- Fingerprint unknown stacks from evidence only

## 1. Company-lens pass (before pixels)

- Who is the user and what is the job
- Can a first-time user succeed without a manual
- What Support would get tickets about
- What would kill trust in one session (pay fail, data loss, security theater, broken mobile)

## 2. Product and design pass

- IA, nav, copy, brand, logo misuse, dead ends
- Every CTA and form
- Empty / error / loading / offline / permission states
- Motion with purpose and reduced-motion path
- Design-system drift (five buttons that should be one)

## 3. Human then machine

- Click every primary and secondary action
- Forms with valid, empty, whitespace, unicode, emoji, RTL, very long, pasted, autofill, bad dates, bad uploads, double submit
- Tab whole surface, shift-tab, Esc, Enter, Space, arrows
- Widths 320, 375, 390, 414, 768, 1024, 1280, 1440, 1920, zoom 200%
- Slow net, offline, cookies blocked, third-party JS blocked, prefers-reduced-motion
- Locales and currencies if present
- Apps also — permission denied, backgrounded, killed, upgraded, push tapped, deep link cold start

## 4. Engineering pass

- Semantics, heading order, landmarks, duplicate IDs
- Overflow, z-index, layout shift sources, image policy
- Console errors, unhandled rejections, races, leaked listeners
- Waterfall, cache headers, huge JSON, chatty APIs, N+1
- API vs UI contract, timezones, money precision, pagination, authz
- Data lifetime — backup, delete, export, silent corruption

## 5. Environment pass (dev to cert)

- Config, secret, flag, data-shape, TLS drift
- Works-on-staging-dies-in-prod as a first-class hunt
- Release checklist — migration forward/back, cache, CDN, smoke, rollback command, comms

## 6. Quality passes

Run the applicable slices in cert-matrix.md. Declare skips.

## 7. Ops, docs, support pass

- New engineer local boot
- Support can diagnose from logs
- Runbook for top failures
- Status, errors, emails written like a human
