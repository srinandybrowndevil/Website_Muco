# Production repair — research, 14 September 2026

Scope: diagnose the failed Vercel deployment, repair customer project intake and the sales pipeline, and validate release readiness. The existing no-commit/no-push instruction remains active. Preserve local work and credentials.

## Verified findings

1. Vercel deployment G7B4iL7rNV3Jp5n9PcWSfh3AthW4 for commit 329bd82 fails before installation: `The specified Root Directory "portal" does not exist.` The repository now contains four applications under `workspaces/apps/`. Its project settings also override the Next.js build with the marketing build command and output directory.
2. GitHub reports marketing deployment success and portal deployment failure for that commit. Several imported preview and customer onboarding modules exist locally but are absent from Git. A successful local build alone does not prove that a fresh deployment has its source files.
3. The public Start a project action returns authenticated customers to `/support`. That page mixes support questions with project requests. Customers without an existing project see no primary action on the overview.
4. Admin Pipeline lists leads without opening or updating them. The latest 150 records drive apparently global totals. Database errors are rendered as empty lists.
5. Request status updates ignore database errors. Conversion has no network exception recovery. The local conversion adapter creates active projects instead of the database's planning projects and omits links/status fields.

## Intended journey

Public website → customer sign-in or sign-up → onboarding if required → Start a project → durable customer request → admin review → acceptance → one lead and one planning project → customer visibility. Sales stages remain separate from delivery progress and billing.

## Release evidence needed

Production builds of all four applications; public generation and audit; schema checks; mobile and desktop intake/conversion/editing regression; safe production auth guards; Vercel root/build/domain mapping; real authentication, database policies and applied migrations. Local sample tests are not evidence of live authorization or delivery.

No prices, delivery promises, testimonials or credentials will be invented. Missing cloud access or release authorization must be reported precisely.
