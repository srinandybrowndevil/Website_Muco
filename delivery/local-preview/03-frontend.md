# Local workspace preview — Frontend handoff

The shared sign-in component now switches to a one-click local entry when the development preview flag is active. It retains safe internal return paths. The preview strip links the five local surfaces and wraps on mobile. Customer request confirmation explicitly identifies a local save.

Backend contract: each app serves a local `/api/preview` endpoint. The existing typed client contract (table queries and supported local writes) is backed by a shared sample store. Responses contain `data`, `error`, and optional `count`; unsupported operations return an explicit preview error. File upload and retrieval are local. No authentication tokens or credentials are needed or returned.

Proxy and account guards must branch before constructing a Supabase client. Account roles are fixed by the application, not supplied by a browser parameter. Credential-only routes redirect to the preview entry. The endpoint must return 404 outside development preview and refuse nonlocal hosts or cross-origin mutations. All records must be fictional and edits persist only under the ignored `.local-preview` directory.
