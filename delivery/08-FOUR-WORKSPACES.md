# Four workspaces, four applications

**Prepared for:** Srinivash Mahalingam, Founder, MUCO LABS
**Date:** 11 September 2026
**Covers:** `admin.`, `employee.`, `intern.` and `client.mucolabs.com`, the retirement of `portal.mucolabs.com`, and the database changes those required
**Status:** Built and verified locally. **Not deployed.** See section 7 before pushing.

> **Historical note (12 September 2026):** This is the earlier four-workspace
> split report. Its statement that self-service sign-up is gone is superseded by
> the current client-only sign-up/onboarding flow documented in
> `delivery/01-RND-BRIEF.md` and `workspaces/DEPLOYMENT-CHECKLIST.md`.

---

## 1. What was asked for

> "scope la portal eruku la aadha full aa remove pandiru i need seperate
> admin.mucolabs.com, intern.mucolabs.com, employee.mucolabs.com, and
> client.mucolabs.com yanaku yella ma seperate aa vanum portal aa total aa
> remove pandi ru thani thani aa code yaludhu"

Restated: remove `portal.mucolabs.com` from the scope entirely, and give each
of the four workspaces its own address and its own codebase, with the best user
interface and experience the work can carry.

## 2. What was built

A `workspaces/` monorepo holding four independently deployable Next.js
applications and the two packages they share.

| Application | Address | Routes | Spec pages |
|---|---|---:|---:|
| `apps/admin` | `admin.mucolabs.com` | 31 | 13 of 13 |
| `apps/employee` | `employee.mucolabs.com` | 18 | 8 of 8 |
| `apps/intern` | `intern.mucolabs.com` | 20 | 9 of 9 |
| `apps/client` | `client.mucolabs.com` | 20 | 9 of 9 |

Every screen in section 11 of the specification exists. The admin console
additionally carries Enquiries, Requests, Analytics and Pipeline. That is not
scope creep: they are the destinations of three surfaces that are already live,
namely the contact form on `mucolabs.com`, the support page in the client
workspace, and the analytics the public site writes. Without them those three
write into tables nobody opens.

The intern workspace also serves `/verify/<serial>` without a session, because
an employer checking a certificate has no account and a verification page that
demands one verifies nothing.

## 3. Why four applications rather than one

The application this replaces already enforced the hard split, in the proxy and
in row-level security, and would have kept doing so. What it could not stop is
the two things that actually mattered:

* Every deploy shipped all four. A change to the client portal re-released the
  intern portal, so the blast radius of any mistake was four products wide.
* One person reading the code saw all four at once, which is how chrome
  converges. Section 11.5 says it directly: "Do not copy admin navigation into
  client or intern chrome."

Four applications make that structural rather than a matter of discipline.

### What is shared, and why that is not a contradiction

`@muco/core` holds the Supabase clients, the session guard and the membership
rules. Sharing it is not a softening of the split, it is where the split is
enforced. One implementation of "which role is this, and has it been switched
off" is safer than four, because four drift.

`@muco/ui` holds tokens and primitives: a button, a field, a table, a status.
It holds no navigation, no shell and no page. Shared vocabulary, separate
voice.

The sign-in form is shared for the same reason. Four copies would be four
chances to get the redirect validation wrong, and an open redirect on a sign-in
page is worth more to an attacker than anything else on these origins.

## 4. Design

Four palettes, not one hue swapped four times. Each workspace has its own
ground, its own accent and its own **density**, and density is a token, so the
same table component renders as an instrument panel in admin and as something
calm and guided in intern without either being rewritten.

| | Ground | Accent | Row | Column | Character |
|---|---|---|---:|---:|---|
| Admin | graphite | copper | 34px | 1360px | Instrument panel. No serif. Grouped rail. |
| Employee | cool light | violet | 38px | 1200px | Working surface. Horizontal nav. |
| Intern | warm paper | deep green | 46px | 920px | One column, larger type, nav under the thumb. |
| Client | ivory | deep blue | 44px | 1040px | Editorial. Serif for the one statement per page. |

Four decisions worth recording.

**Every accent was chosen by measured contrast, not by eye.** The last time
this codebase picked one by eye it shipped a primary button at 2.31:1 on
phones. Each accent passes 4.5:1 on its own ground, and each `--accent-ink`
passes 4.5:1 on the accent.

**Every theme declares its complete light palette on bare `:root`.** The
default "system" setting stamps no `data-theme` attribute, so the un-stamped
document is what most people see; a colour defined only inside a media query
renders one theme's text on the other theme's ground.

**Status is never colour alone.** Each state carries a shape as well, a filled
dot for running, a hollow one for waiting, a bar for stopped, so it survives
greyscale, printing, and the eight per cent of men with a colour vision
deficiency.

**The client workspace states status in a sentence, not a percentage.** "We are
building your website now." Section 12 asks for project status to stay honest
and not show a fake completion figure; a bar at eighty per cent is a promise
nobody at the studio made.

## 5. Database changes

Six migrations, all applied to production, all proved by probes that run inside
a transaction ending in an exception, so nothing is left behind.

**More than one person per customer.** Section 11.5 asks for a People page
where the client owner invites their manager or viewer, and the schema could
not express it: client access ran through `customers.auth_user_id`, one column
and one person, and `accept_invitation` refused a second person outright. The
relationship moved into `customer_members` with owner, manager and viewer
levels, backfilled before any policy started reading it. Five client-facing
policies now ask `is_customer_member(...)`.

**A client owner can invite.** `invite_client_colleague` takes the
organisation, the customer and the role from the caller's own record rather
than from arguments, refuses to mint an owner, and caps an organisation at ten
people.

**Eight functions stopped answering without a session.** None was exploitable,
each already refused, but "already refuses" is a property of a function body
and a body is a thing somebody edits. Three of the first seven revokes did
nothing, because Postgres grants EXECUTE to PUBLIC by default and `anon`
inherits it. Checking afterwards is what caught that.

**Two storage policies caught up with the table policies.** One gap this work
created, one older and larger: `crm staff upload` and `crm staff remove` read
`memberships` directly, so the disable switch never reached them and a
switched-off administrator could still upload to and delete from the customer
bucket.

**A timezone bug, found sideways by a linter.** Six places computed today as
`new Date().toISOString().slice(0, 10)`, which is UTC, so between midnight and
5:30am in Erode it named yesterday and "grants expiring from today" silently
missed a day's worth of rows every night.

## 6. Verification

| Check | Result |
|---|---|
| TypeScript, four applications and two packages | clean |
| ESLint, four applications | clean |
| Production build, four applications | all four compile |
| `scripts/schema-check.py` | 222 queries, every column and foreign key exists |
| `scripts/site-audit.py` | 25 pages, nothing failing |
| Playwright, desktop and Pixel 7 | **144 passed** |
| Row-level security probes | run as each role against production, rolled back |

The browser suite covers what a route can be checked for without a session:
each workspace signs in on its own address, paints its own accent **on a real
button**, keeps a deep link through sign-in, serves `robots.txt` rather than
redirecting a crawler to it, carries the security headers, explains a
switched-off account rather than offering onboarding, answers a certificate
verification without a session, and redirects `portal.` permanently to
`client.` with the path intact.

Nine of those checks failed on the first run and reported a product failure
they had not found: Playwright's `request` fixture resolves through Node, and
Node does not special-case `*.localhost` the way every browser does. Driven
through the browser, the same checks pass.

## 7. Before this goes live

**Do not push until the four deployments exist.** `portal/` is deleted from
this repository. Whatever currently builds `portal.mucolabs.com` builds from
here, so the next deploy from `main` will fail, and there is nothing yet to
take its place.

What is needed, and only you can do it:

1. Four projects, rooted at `workspaces/apps/{admin,employee,intern,client}`.
2. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on each.
3. DNS for the four subdomains.
4. `portal.mucolabs.com` pointed at the **client** project, so the permanent
   redirect in its proxy answers.
5. The same two values as repository secrets, which switches the browser tests
   on in CI.

## 8. Decisions that are yours, not mine

**Self-service sign-up is gone.** Section 11.1 lists sign in, reset password
and invite accept, and does not list registration, so the four workspaces are
invitation-only and every call to action on `mucolabs.com` now points at the
site's own contact form. Lead capture is unchanged: the form still writes into
`website_enquiries`, those land under Enquiries, and you convert one and send
an invitation. Restoring sign-up is one constant in `build.py` and one page in
`apps/client`.

**Invitations are not emailed.** There is no transactional mail configured, so
an invitation appears as a link for you to send. Workable for three people, not
for twenty.

**Attendance counts Monday to Friday**, and your published hours are Monday to
Saturday. Section 16 leaves the rule open on purpose, so it was left alone and
named here rather than changed quietly.

**Client owners can now invite colleagues.** Bounded, at ten per organisation,
no minting of owners and no reach outside their own customer, but it is the
first function a non-staff account can use to create an invitation.

## 9. What I would do next

1. **A seeded organisation and signed-in browser tests.** Everything above is
   proved by builds, schema checks and SQL probes. No browser has yet loaded
   `/people` with real rows, and PostgREST embed disambiguation at runtime is
   precisely the class of bug that survives a schema check.
2. **Email delivery for invitations.**
3. **Two operational items for you:** rotate the founder password that was
   shared in an earlier session, and switch on Supabase's leaked-password
   protection. The client-side breach check in these applications is a stand-in
   for it, not a replacement.

## 10. One advisor finding accepted rather than fixed

Supabase reports `public.granted_projects` as a SECURITY DEFINER view. That is
deliberate. The view exists so an employee or intern reads the project room and
not the money: `budget`, `repo_url`, `customer_id` and `owner_id` are absent by
construction, and the staging links are gated inside the view rather than in a
page. Row-level security cannot restrict columns, so the answer was never a
better policy, it was a narrower object to read.
