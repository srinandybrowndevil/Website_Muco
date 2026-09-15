# MUCO Labs workspace deployment checklist

The source now contains four independent Next.js applications. Each must be a
separate Vercel project with the repository root set to the matching directory:

| Hostname | Vercel root directory | Expected page title |
| --- | --- | --- |
| `admin.mucolabs.com` | `workspaces/apps/admin` | MUCO LABS Admin |
| `employee.mucolabs.com` | `workspaces/apps/employee` | MUCO LABS Employee |
| `intern.mucolabs.com` | `workspaces/apps/intern` | MUCO LABS Intern |
| `client.mucolabs.com` | `workspaces/apps/client` | MUCO LABS Client |

Use the same `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in all four projects. Do not add a
service-role key to any browser or Vercel environment. The client project also
needs the `avatars` storage bucket and the migrations through
`20261113000000_customer_profile_links.sql` applied before it is opened to
customers.

The marketing site is a fifth deployment from the repository root. Its build
command is `node scripts/build-site.mjs`; it must serve the generated static
files and keep its contact links pointed at `client.mucolabs.com`.

## Smoke check after every deploy

1. Open `/login` on all four hosts and confirm each title and accent belongs to
   that workspace.
2. Open `https://mucolabs.com/contact` and confirm the sign-in and create-account
   buttons point to the client host. No sales link should expose `mailto:`,
   `tel:` or `wa.me` directly.
3. Open `client.mucolabs.com/signup`, create a test account, confirm the email,
   complete `/onboarding`, and verify that the destination is `/support`.
4. In the client workspace, open **Organisation**, upload a square photo, edit
   name/phone/LinkedIn/Instagram, refresh, and confirm all values persist.
5. In the admin workspace, open **Requests**, select a request, and confirm the
   detail page loads. This check catches the common failure where the admin DNS
   record is serving the client deployment.

## Live audit finding (12 September 2026)

At the time of this audit, all five workspace hostnames answered HTTP 200 with
the same “MUCO LABS · Client Workspace” login shell. The source applications
already have distinct layouts and metadata; the live result means the Vercel
projects or custom-domain assignments have not been switched to the four
workspace roots yet. Complete the mapping above, redeploy, then repeat the
smoke check. No code change can correct a domain attached to the wrong Vercel
project.
