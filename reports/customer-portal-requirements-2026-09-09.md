# MUCO LABS — Customer portal requirements and delivery scope

Approved scope recorded 9 September 2026.

## Customer entry

- Every public **Start a Project** CTA opens `https://portal.mucolabs.com/login?next=%2Fportal%2Frequests%2Fnew`.
- Returning customers use Sign in; new customers use the Create a customer account link on the same screen.
- Google OAuth and email/password signup are available through Supabase Auth.
- After authentication, the requested path opens the New Project Request form.
- The public contact form remains available for general questions and visitors who are not ready to create an account.

## Customer navigation

The customer workspace keeps internal CRM screens separate from the customer view. Customer navigation contains:

- Dashboard: project progress, proposals, invoices and shared deliverables.
- Projects: active project records and milestone progress.
- Requests: submitted requests, status, service, timeline and follow-up information.
- Files: customer-scoped deliverables with signed downloads.
- New request: a guided project or support request with service, problem, requirements, timeline, contact preference and optional attachments.

Customers never receive navigation to leads, staff settings, other customers, internal automations or team-only records. Supabase row-level security remains the final authority for every query.

## Service-specific request guidance

- Websites: content, brand assets, domain, hosting and approval checkpoints.
- Software and apps: requirements, roles, milestones, integrations, testing and change requests.
- AI and automation: workflow, data sources, approval rules and operating cost assumptions.
- SEO and marketing: goals, channels, content approvals and reporting cadence.
- Support and maintenance: issue severity, affected service, evidence and preferred response channel.

## Implemented in source

- Start Project links now route through customer authentication.
- Customer portal navigation now exposes Dashboard, Projects, Requests, Files and New request.
- Projects and Files sections have stable anchors for direct navigation.
- Local portal development server was started and `/login` returns HTTP 200.
- Portal tests, TypeScript, lint and production build pass.

## Remaining live verification

- Complete one customer Google account sign-in and confirm customer membership routing to `/portal/requests/new` (the founder/admin callback was verified to the live `portal.mucolabs.com` workspace).
- Complete one test customer signup and onboarding record.
- Submit one agreed test request and confirm it appears in the staff CRM without sending an unintended customer notification.
- Confirm the portal deployment has picked up the latest source commit; the Vercel CLI is not authenticated in this workspace.
