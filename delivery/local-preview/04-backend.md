# Local workspace preview — Backend handoff

All four local applications branch before constructing Supabase clients. The development flag cannot enable preview in a production build. `/api/preview` is disabled outside that mode, rejects nonlocal hosts and checks the origin of browser writes. Recovery and account-creation routes lead back to one-click entry.

An isolated sample store in `.local-preview` supplies the existing table/query interfaces, nested relationships and counts. A file lock serializes writes across the four processes; atomic replacement preserves completed edits. Requests, profiles, tasks, settings, milestones and other table-backed forms write to this store. Sample request conversion and sample certificate creation are local operations. Invitation/account RPCs return explicit unavailable messages and never claim external success.

File upload and download stay on localhost; storage filenames are hashes of logical paths. Sample certificates are clearly marked invalid. The public local server rewrites workspace links and removes analytics scripts at response time, leaving generated production HTML intact. It refuses external enquiry delivery in preview. A launcher starts all five servers together and retains logs under `.local-logs`.

Testing must distinguish local UI/data behavior from Supabase authentication, authorization policies and delivery integrations. The latter remain disconnected and are not validated by preview tests.
