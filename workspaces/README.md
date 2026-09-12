# MUCO LABS — four workspaces

Four separate products. One identity system. One database.

```
workspaces/
  apps/
    admin/       admin.mucolabs.com      the founder's console
    employee/    employee.mucolabs.com   staff and contracted builders
    intern/      intern.mucolabs.com     interns
    client/      client.mucolabs.com     customers
  packages/
    core/        @muco/core   Supabase access, sessions, roles, formatting
    ui/          @muco/ui     design tokens and primitives
  supabase/
    migrations/  the schema all four read
```

## Why four applications and not one

The specification asks for four workspaces, "not one shared dashboard with
different buttons hidden by CSS". A single application can satisfy that — the
previous one did, with a hard split enforced in the proxy and in row-level
security — but it leaves two things true that the founder did not want:

* Every deploy ships all four. A change to the client portal rebuilds and
  re-releases the intern portal, so the blast radius of any mistake is four
  products wide.
* One person reading the code sees all four at once. The chrome, the palette
  and the navigation converge, because the easiest thing to do is reuse the
  component that is already there. The specification says explicitly: "Do not
  copy admin navigation into client or intern chrome."

Four applications make the separation structural rather than disciplined.

## What is shared, and why that is not a contradiction

`@muco/core` holds the Supabase clients, the session guard, the membership
rules and the formatters. Sharing it is not a softening of the split: it is
where the split is *enforced*. One implementation of "which role is this, and
has it been switched off" is safer than four, because four drift.

`@muco/ui` holds design tokens and primitives — a button, a field, a table, a
badge. It holds no navigation, no shell, no page. Each application builds its
own chrome from its own palette and its own density. That is the line: shared
vocabulary, separate voice.

## Sessions

Each host holds its own session cookie. Signing in to `admin.mucolabs.com`
does not sign you in to `intern.mucolabs.com`, and that is deliberate — these
are four products, and a session that spans all four would quietly re-create
the single application this structure exists to avoid.

Arriving at the wrong front door is not refused with a locked page. Each
application recognises the role it does not serve and names the address that
does.

The client workspace is the one exception to the invitation-only rule: a new
customer may use `/signup`, confirm their email (or continue with Google), and
complete `/onboarding` before opening a request. Admin, employee and intern
accounts remain invite-only.

## portal.mucolabs.com

Retired as a workspace, kept as an address. The client application answers on
that hostname and issues a permanent redirect to `client.mucolabs.com`,
preserving the path. Several hundred published links point there.

## Running all four

```
npm install
npm run dev          # all four, ports 3101-3104
npm run dev:admin    # one at a time
npm run build
npm run typecheck
```

Local addresses mirror production: `admin.localhost:3101`,
`employee.localhost:3102`, `intern.localhost:3103`, `client.localhost:3104`.
No hosts-file entry is needed; `*.localhost` resolves on every current browser.
