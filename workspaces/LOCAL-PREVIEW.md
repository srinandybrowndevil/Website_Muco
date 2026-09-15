# Credential-free local preview

From the repository root, run `npm run preview`. Open [the preview launcher](http://localhost:8123/__preview), choose a workspace and click **Sign in**. No email, password, Google account or Supabase setup is required.

| Surface | Local address |
| --- | --- |
| Public website | http://localhost:8123 |
| Customer | http://localhost:3104/login |
| Admin | http://localhost:3101/login |
| Employee | http://localhost:3102/login |
| Intern | http://localhost:3103/login |

The pages use fictional sample records. Profile edits, square avatar uploads, requests, status changes, tasks, settings and other local record changes persist under `.local-preview`. A request saved in Customer → Support can be opened in Admin → Requests. Refresh an already-open page to see changes from another workspace. Use sample details when experimenting.

`npm run preview:reset` discards **only local sample edits and uploads**. Refresh to restore the initial sample records. Logs are under `.local-logs/preview-<workspace>.log`. Both directories are ignored by Git.

This mode disconnects authentication and Supabase access. Invitations, account changes, emails and production enquiry delivery do not run. The existing integration code and environment files are retained for reconnection after development; no remote users or database records are deleted. Certificates in this mode are samples and are not valid credentials. The sample adapter does not simulate Supabase row-level security or prove that production authentication works.

The launcher explicitly enables `NEXT_PUBLIC_LOCAL_PREVIEW=1` with `NODE_ENV=development`, binds the apps to loopback, and uses webpack for stable local compilation. Production builds always disable this mode, including when the flag is set. Running normal application `dev` scripts without the flag uses the connected setup. Stop the preview before starting another server on the same ports.

Run `npm run test:preview` for local browser tests. The normal authenticated-route test suite is separate and must run against servers with preview disabled. No commit, push or deployment is part of enabling this preview.
